"""CHAT10-MO-02: lossless human projection of qualified missing-field rows.
The established machine write/refusal map remains the authority. No slot, party,
fixture or repeated source-page occurrence is merged with a different occurrence.
"""
import json
from pathlib import Path

def display_name(party):
    if party.get('organization'):
        return party['organization']
    return ' '.join(str(party.get(k) or '').strip() for k in ('firstName','middleName','lastName')).strip()

def item_for(row, facts):
    item={k:row.get(k) for k in ('fieldId','fixture','documentId','formNumber','fieldName','printedLabel','effectiveLabel','factId','page','sourcePage','partyIndex','reason','completionActor')}
    party_index=row.get('partyIndex')
    if party_index is not None:
        parties=[facts['participant']]+facts['respondents']
        if party_index<0 or party_index>=len(parties):
            raise ValueError('A missing-information row must identify an actual party')
        party=parties[party_index]
        item.update(partyName=display_name(party),partyRole='Petitioner' if party_index==0 else f'Respondent {party_index}',sheet=party_index//3+1,slot=party_index%3+1)
    elif row['formNumber']=='CR301':
        item.update(partyName=display_name(facts['participant']),partyRole='Petitioner',sheet=None,slot=None)
    elif row.get('factId','') and ':participant.' in row['factId']:
        item.update(partyName=display_name(facts['participant']),partyRole='Submitter / petitioner',sheet=None,slot=None)
    else:
        item.update(partyName=None,partyRole='Filing information',sheet=None,slot=None)
    return item

def entry_text(item):
    # Printed labels stay intact for field-to-page matching; the enclosing scope
    # distinguishes both Party slot 1 occurrences without relabeling the source.
    who=item['partyRole']+(f" — {item['partyName']}" if item.get('partyName') else '')
    where=f"{item['formNumber']}; packet page {item['page']}; official source page {item['sourcePage']}"
    if item.get('sheet') is not None:
        where+=f"; party sheet {item['sheet']}, slot {item['slot']}"
    return f"- **{who}** | {where} | **{item['effectiveLabel']}**. {item['reason']}\n  Field reference: `{item['fieldId']}`"

def completion_section(variant, facts, entries):
    heading=f"## Missing information: {variant['id']}\n\nPrepared for **{display_name(facts['participant'])}**. Applies only to `{variant['packet']}`. Page numbers identify this exact complete packet.\n\n"
    if not entries:
        return heading+('No court forms are delivered on this guidance-only route. This is not confirmation that notice, an order or post-order relief exists. Follow the guide to verify the actual record.\n' if facts.get('route')=='automatic-on-notice' else 'No missing-information rows were recorded for this exact fixture. Review the forms and separately complete actual signatures and court-directed steps; this is not a filing approval.\n')
    text='These are missing or applicability-unconfirmed details for the named person, agency or filing, not completed signatures, notices or court decisions. Obtain or confirm each before filing. Full SSN is supplied only when reasonably available; do not substitute four digits. A known value must be written, not described as missing.\n\n'
    return heading+text+'\n\n'.join(entry_text(x) for x in entries)+'\n'

def emit_completion_lists(out, manifest, blanks):
    out=Path(out); all_items=[]; summaries=[]
    # The index is deliberately not a guide "prepared for" a single fixture.
    index=['# Missouri mistaken-identity guides and completion lists',
           'Each guide and list below belongs only to its named synthetic fixture and exact packet selection. Do not combine people, repeated party sheets, or page numbers from different packets. Later execution and post-order steps are described in the corresponding guide, not claimed completed here.']
    index.append((out/'post-order-follow-through.md').read_text().rstrip())
    for variant in manifest['variants']:
        fixture=variant['id'].split('.')[0]
        facts=json.loads((out/f'{fixture}.fixture.json').read_text())
        rows=[r for r in blanks if r.get('fixture')==variant['id'] and r.get('requiredBeforeFiling') is True]
        entries=[item_for(r,facts) for r in rows]
        entries.sort(key=lambda x:(x['page'],x.get('partyIndex') if x.get('partyIndex') is not None else -1,x['fieldId']))
        section=completion_section(variant,facts,entries)
        path=out/'instructions'/f"{variant['id']}.md"
        guide=path.read_text().split('\n## Missing information:')[0].rstrip()
        path.write_text(guide+'\n\n'+section)
        listpath=out/'missing-information'/f"{variant['id']}.md";listpath.parent.mkdir(parents=True,exist_ok=True)
        listpath.write_text('# Before filing: exact packet completion list\n\n'+section)
        index.append(f"[Complete guide for {variant['id']}](instructions/{variant['id']}.md) · [Separate completion list](missing-information/{variant['id']}.md)\n\n"+section)
        all_items.extend(entries);summaries.append(dict(fixture=variant['id'],participant=display_name(facts['participant']),packet=variant['packet'],guide=str(path.relative_to(out)),list=str(listpath.relative_to(out)),missingCount=len(entries)))
    ids=[x['fieldId'] for x in all_items]
    assert len(ids)==len(set(ids)), 'A missing-field occurrence must not be emitted twice'
    assert set(ids)=={r['fieldId'] for r in blanks if r.get('requiredBeforeFiling') is True}, 'Every qualified required blank must be disclosed exactly once'
    (out/'participant-instructions.md').write_text('\n\n'.join(index)+'\n')
    (out/'reports/missing-information.json').write_text(json.dumps(dict(schemaVersion=1,scope='Per exact fixture and actual party; page numbers are absolute packet pages',variants=summaries,items=all_items),indent=2)+'\n')
