"""Source-bound negative controls. Requires the four privately held originals."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('court', Path(__file__).with_name('verify-court-source-handoff.py'))
court = importlib.util.module_from_spec(spec)
spec.loader.exec_module(court)


class CourtSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = court.ROOT / court.DIRECTORY
        cls.receipt = json.loads((cls.directory / 'source-receipt.json').read_text())

    def source(self, name):
        row = next(x for x in self.receipt['sources'] if x['filename'] == name)
        raw = (court.ROOT / row['heldCorpusPath']).read_bytes()
        mapping = json.loads((self.directory / court.MAPS[name]).read_text())
        return raw, row, mapping

    def test_actual_four_sources_and_retained_mappings(self):
        self.assertEqual(court.verify()['status'], 'PASS')

    def test_modified_or_truncated_original_is_refused(self):
        for row in self.receipt['sources']:
            raw, row, mapping = self.source(row['filename'])
            for changed in [raw[:-1], bytes([raw[0] ^ 1]) + raw[1:]]:
                with self.subTest(source=row['filename']), self.assertRaisesRegex(ValueError, 'source (length|SHA-256) mismatch'):
                    court.verify_mapping(changed, row, mapping)

    def test_no_paper_fillable_geometry_substitution(self):
        raw, row, _ = self.source('cpl160.59sealingapplication.pdf')
        _, _, fillable = self.source('cpl160.59sealingapplication-fillable.pdf')
        with self.assertRaisesRegex(ValueError, 'identity mismatch'):
            court.verify_mapping(raw, row, fillable)

    def test_each_widget_coordinate_is_source_bound(self):
        for name in ['cpl160.59sealingapplication-fillable.pdf', 'cc1474a.pdf']:
            raw, row, mapping = self.source(name)
            for index in range(len(mapping['fields'])):
                changed = copy.deepcopy(mapping)
                changed['fields'][index]['rect'][0] += 1
                with self.subTest(source=name, widget=index), self.assertRaisesRegex(ValueError, 'identity/geometry'):
                    court.verify_mapping(raw, row, changed)

    def test_paper_anchor_drift_refused(self):
        raw, row, mapping = self.source('cpl160.59sealingapplication.pdf')
        mapping['paperAnchors'][0]['textRects'][0][0] += 1
        with self.assertRaisesRegex(ValueError, 'paper anchor drift'):
            court.verify_mapping(raw, row, mapping)

    def test_no_source_intake_promotes_authority(self):
        raw, row, mapping = self.source('cc1473.pdf')
        for key in ['generationAllowed', 'runtimeSelectable', 'commercialAuthority']:
            changed = copy.deepcopy(mapping); changed[key] = True
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'production authority'):
                court.verify_mapping(raw, row, changed)

    def test_neither_va_form_is_pardon_instrument(self):
        for name in ['cc1473.pdf', 'cc1474a.pdf']:
            raw, row, mapping = self.source(name)
            mapping['procedure'] = 'absolute_pardon'
            with self.subTest(source=name), self.assertRaises(ValueError):
                court.verify_mapping(raw, row, mapping)

    def test_nonwidget_judge_block_cannot_disappear(self):
        raw, row, mapping = self.source('cc1474a.pdf')
        mapping['nonWidgetObligations'] = mapping['nonWidgetObligations'][:1]
        with self.assertRaisesRegex(ValueError, 'court order'):
            court.verify_mapping(raw, row, mapping)

    def test_actual_execution_not_inferred_from_shared_field_name(self):
        raw, row, mapping = self.source('cpl160.59sealingapplication-fillable.pdf')
        next(w for w in mapping['fields'] if w['field'] == 'ApplicantAffirmationDay')['candidateBinding'] = 'today'
        with self.assertRaisesRegex(ValueError, 'executed affirmations'):
            court.verify_mapping(raw, row, mapping)

    def test_source_intake_does_not_approve_legal_review(self):
        raw, row, mapping = self.source('cc1473.pdf')
        mapping['qualifiedApproval'] = 'owner upload'
        with self.assertRaisesRegex(ValueError, 'qualified approval'):
            court.verify_mapping(raw, row, mapping)


if __name__ == '__main__':
    unittest.main()
