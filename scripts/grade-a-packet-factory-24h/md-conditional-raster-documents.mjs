/** Complete static review inventory, including unselectable diagnostic PDFs.
 * This helper does not make diagnostic outputs eligible for filing/delivery.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadMdConditionalCandidate,MD_CONDITIONAL_FAMILIES,MD_CONDITIONAL_DIRECTORIES} from '../rcap-packet-completeness/md-conditional-native-candidates.mjs';

export function mdConditionalRasterDocuments({report,fixtures,root}){
  if(!MD_CONDITIONAL_FAMILIES.includes(report?.familyId))return null;
  const directory=MD_CONDITIONAL_DIRECTORIES[report.familyId];
  assert.equal(path.resolve(fixtures),path.resolve(root,directory,'fixtures'),'Wrong Maryland fixture directory');
  const loaded=loadMdConditionalCandidate({root,directory,familyId:report.familyId});
  const installed=JSON.parse(fs.readFileSync(path.join(root,directory,'reports/rendered-artifacts.json')));
  assert.deepEqual(report,installed,'Maryland raster inventory differs from exact reviewed outputs');
  return loaded.fixtures.filter(f=>!['canonical','boundary'].includes(f.fixture)).map(f=>({
    role:'canonical',name:`${f.fixture}.pdf`,declaredPageCount:f.artifact.pageCount,branch:f.fixture,
    diagnostic:!f.prepared,selectionPermitted:f.prepared,filingPermitted:false
  })).sort((a,b)=>a.name.localeCompare(b.name,'en'));
}
