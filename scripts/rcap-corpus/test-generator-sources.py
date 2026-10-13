"""Isolated graph, aggregate custody, original-binding and runtime-read controls."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('chain', Path(__file__).with_name('restore-generator-sources.py'))
chain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chain)
sha = lambda b: hashlib.sha256(b).hexdigest()


class SourceChainTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='generator-custody-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        (self.root / '.gitignore').write_text('private/\n')
        self.raw = [b'%PDF synthetic A', b'%PDF synthetic B']
        self.rows = [{'path': 'private/source-'+str(i)+'.pdf', 'sha256':sha(raw), 'byteLength':len(raw), 'url':'https://court.example/'+str(i)} for i,raw in enumerate(self.raw)]
        module = self.write('entry.mjs', b'import "./child.mjs";\n')
        child = self.write('child.mjs', b'// bounded generator fixture\n')
        receipt = self.write('receipt.json', json.dumps({'sources':self.rows}).encode())
        self.m = {'schemaVersion':'rcap-generator-source-preflight/v1','entrypoints':['entry.mjs'],
                  'moduleClosure':[self.pin(module),self.pin(child)],
                  'records':[{**self.pin(receipt),'sourcePointers':['/sources/0','/sources/1']}],
                  'sources':[{**{k:r[k] for k in ['path','sha256','byteLength']},'evidence':[{'record':'receipt.json','pointer':'/sources/'+str(i)}],
                    'recordedUrls':[r['url']],'transport':'recorded-official-url'} for i,r in enumerate(self.rows)]}

    def write(self, relative, raw):
        p=self.root/relative;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);return p

    def pin(self,p):
        b=p.read_bytes();return {'path':str(p.relative_to(self.root)),'sha256':sha(b),'byteLength':len(b)}

    def restore(self, **kw):return chain.restore(self.root,manifest=self.m,**kw)

    def test_all_exact_sources_before_install_then_idempotent(self):
        with patch.object(chain.exact,'download',side_effect=self.raw):r=self.restore()
        self.assertEqual((r['status'],r['installedFiles']),('PASS',2))
        with patch.object(chain.exact,'download') as download:
            self.assertEqual(self.restore()['installedFiles'],0);download.assert_not_called()

    def test_reports_every_missing_source(self):
        r=self.restore(check_only=True)
        self.assertEqual([x['path'] for x in r['allMissingOrMismatched']],[x['path'] for x in self.rows])
        self.assertEqual(r['installedFiles'],0)

    def test_bad_second_download_installs_neither(self):
        with patch.object(chain.exact,'download',side_effect=[self.raw[0],b'wrong']):r=self.restore()
        self.assertEqual(r['status'],'REFUSED');self.assertEqual(r['installedFiles'],0)
        self.assertFalse((self.root/self.rows[0]['path']).exists())

    def test_all_wrong_hashes_reported(self):
        with patch.object(chain.exact,'download',side_effect=[b'x'*len(x) for x in self.raw]):r=self.restore()
        self.assertEqual(len(r['allMissingOrMismatched']),2)
        self.assertTrue(all('SHA-256' in x['reason'] for x in r['allMissingOrMismatched']))

    def test_custody_unavailable_aggregates(self):
        with patch.object(chain.exact,'download',side_effect=chain.exact.Refused('HTTP 404')):r=self.restore()
        self.assertEqual(len(r['allMissingOrMismatched']),2)
        self.assertTrue(all(x['custodianAction'] for x in r['allMissingOrMismatched']))

    def test_existing_wrong_bytes_preserved(self):
        self.write(self.rows[0]['path'],b'preserve')
        with patch.object(chain.exact,'download',return_value=self.raw[1]):r=self.restore()
        self.assertEqual(r['status'],'REFUSED');self.assertEqual((self.root/self.rows[0]['path']).read_bytes(),b'preserve')

    def test_changed_source_pin_refused(self):
        self.m['sources'][0]['sha256']='0'*64
        with self.assertRaisesRegex(chain.exact.Refused,'custody disagree'):self.restore()

    def test_changed_transport_refused(self):
        self.m['sources'][0]['recordedUrls']=['https://different.example/replacement.pdf']
        with self.assertRaisesRegex(chain.exact.Refused,'transport not bound'):self.restore()

    def test_changed_receipt_refused(self):
        self.write('receipt.json',b'{}')
        with self.assertRaises(chain.exact.Refused):self.restore()

    def test_omitted_source_refused(self):
        self.m['sources'].pop()
        with self.assertRaisesRegex(chain.exact.Refused,'every declared receipt'):self.restore()

    def test_new_transitive_module_refused(self):
        p=self.write('child.mjs',b'import "./new.mjs";');self.m['moduleClosure'][1]=self.pin(p)
        with self.assertRaisesRegex(chain.exact.Refused,'unreviewed generator module'):self.restore()

    def test_changed_module_bytes_refused(self):
        self.write('child.mjs',b'changed')
        with self.assertRaises(chain.exact.Refused):self.restore()

    def test_symlink_and_unignored_destinations_refused(self):
        (self.root/'.gitignore').write_text('')
        self.assertEqual(len(self.restore()['allMissingOrMismatched']),2)
        (self.root/'.gitignore').write_text('private/\n')
        (self.root/'private').symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(chain.exact.Refused,'symlink'): self.restore()

    def test_runtime_guard_catches_unlisted_and_caught_errors(self):
        guard=self.write('scripts/rcap-corpus/guard-generator-source-reads.cjs',(chain.ROOT/'scripts/rcap-corpus/guard-generator-source-reads.cjs').read_bytes())
        self.write(chain.MANIFEST,json.dumps(self.m).encode())
        for row,raw in zip(self.rows,self.raw):self.write(row['path'],raw)
        def run(relative):
            script="const fs=require('fs');try{fs.readFileSync(process.argv[1])}catch{};process.exit(0)"
            return subprocess.run(['node','--require',str(guard),'-e',script,relative],cwd=self.root,capture_output=True)
        self.assertEqual(run(self.rows[0]['path']).returncode,0)
        self.write('private/unlisted.pdf',self.raw[0]);self.assertEqual(run('private/unlisted.pdf').returncode,1)
        self.write(self.rows[0]['path'],b'wrong');self.assertEqual(run(self.rows[0]['path']).returncode,1)

    def test_caught_child_refusal_fails_aggregate(self):
        guard=self.write('scripts/rcap-corpus/guard-generator-source-reads.cjs',(chain.ROOT/'scripts/rcap-corpus/guard-generator-source-reads.cjs').read_bytes())
        self.write(chain.MANIFEST,json.dumps(self.m).encode())
        audits=Path(self.temp.name+'-audits');self.addCleanup(lambda: __import__('shutil').rmtree(audits,ignore_errors=True))
        env={**os.environ,'NODE_OPTIONS':'--require '+str(guard),'GENERATOR_SOURCE_AUDIT_DIR':str(audits)}
        script="try{require('child_process').execFileSync(process.execPath,['-e',\"try{require('fs').readFileSync('private/unlisted.pdf')}catch{}\"])}catch{}"
        parent=subprocess.run(['node','-e',script],cwd=self.root,env=env,capture_output=True)
        self.assertEqual(parent.returncode,0) # Existing denominator catches child failure.
        module=(chain.ROOT/'scripts/rcap-corpus/check-generator-convergence.mjs').as_uri()
        probe="import {auditResults} from "+json.dumps(module)+";console.log(JSON.stringify(auditResults(process.argv[1])))"
        summary=json.loads(subprocess.check_output(['node','--input-type=module','-e',probe,str(audits)],cwd=self.root))
        self.assertEqual(summary['status'],'REFUSED');self.assertEqual(summary['processCount'],2)

    def test_conditional_corpus_sources_match_pins_and_absence_stays_explicit(self):
        index={'custodies':[{'id':'master_library','root':'private/master','pathsRelativeTo':'custodyRoot'}],
               'entries':[{'custody':'master_library','path':'one.pdf','sha256':sha(self.raw[0]),'byteLength':len(self.raw[0])}]}
        p=self.write('index.json',json.dumps(index).encode());self.m['conditionalCorpusIndex']=self.pin(p)
        for row,raw in zip(self.rows,self.raw):self.write(row['path'],raw)
        r=self.restore();self.assertEqual(r['conditionalIndexedSources'][0]['status'],'NOT_PRESENT_NOT_READ')
        self.write('private/master/one.pdf',self.raw[0]);self.assertEqual(self.restore()['conditionalIndexedSources'][0]['status'],'VERIFIED')
        self.write('private/master/one.pdf',b'wrong');self.assertEqual(self.restore()['status'],'REFUSED')

    def test_current_inventory_scope_and_all_original_records(self):
        m=json.loads((chain.ROOT/chain.MANIFEST).read_text())
        sources=chain.inventory(chain.ROOT,m)
        self.assertEqual(len(m['entrypoints']),5)
        self.assertGreaterEqual(len(m['moduleClosure']),38)
        for name in ['efiling-order.pdf','local-rule19.pdf','Arial.TTF','arial32.exe']:
            self.assertTrue(any(x['path'].endswith('/'+name) for x in sources))


if __name__=='__main__':unittest.main()
