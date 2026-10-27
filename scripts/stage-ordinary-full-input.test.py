import hashlib,importlib.util,io,json,pathlib,stat,tempfile,unittest,zipfile
spec=importlib.util.spec_from_file_location('stage_ordinary',pathlib.Path(__file__).with_name('stage-ordinary-full-input.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class StageTests(unittest.TestCase):
 def archive(self,extra=None):
  payload=b'{}';binding=json.dumps({'schemaVersion':'ordinary-full-control-binding/v1','executionToolsSha':'a'*40,'filePins':{'window.json':hashlib.sha256(payload).hexdigest()}}).encode();out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:
   z.writestr('binding.json',binding);z.writestr('window.json',payload)
   if extra:z.writestr(extra,b'{}')
  return out.getvalue(),hashlib.sha256(binding).hexdigest()
 def test_private_exact_bytes_and_duplicate_destination_refusal(self):
  with tempfile.TemporaryDirectory(dir='/tmp') as root:
   raw,pin=self.archive();mod.stage(raw,pin,root,'a'*40);dest=pathlib.Path(root)/'ordinary-full-input';self.assertEqual(stat.S_IMODE(dest.stat().st_mode),0o700);self.assertEqual(stat.S_IMODE((dest/'window.json').stat().st_mode),0o600)
   with self.assertRaises(AssertionError):mod.stage(raw,pin,root,'a'*40)
 def test_traversal_or_wrong_frozen_hash_never_stages(self):
  with tempfile.TemporaryDirectory(dir='/tmp') as root:
   raw,pin=self.archive('../escape.json')
   with self.assertRaises(AssertionError):mod.stage(raw,pin,root,'a'*40)
   self.assertFalse((pathlib.Path(root)/'ordinary-full-input').exists())
   raw,pin=self.archive()
   with self.assertRaises(AssertionError):mod.stage(raw,'f'*64,root,'a'*40)
if __name__=='__main__':unittest.main()
