import {getProgramExperience} from '../../src/lib/partners/onboarding/program-experience-service';
import {loadArtifactSourceInput} from '../../src/lib/partners/onboarding/artifact-service';
import {artifactGeneratorVersion,detectArtifactDrift,projectArtifactSource} from '../../src/lib/partners/onboarding/artifact-domain';
import {getSupabaseAdminClient} from '../../src/lib/supabase/server';
(async()=>{
 if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:54321')throw new Error('Local only');
 const db=getSupabaseAdminClient()!;const slug='integrated-partner-mv2s5z7c';
 const {data:actor}=await db.from('partner_users').select('auth_user_id').eq('partner_slug',slug).eq('role','partner_admin').single();
 const view=await getProgramExperience({partnerSlug:slug,authUserId:actor!.auth_user_id,role:'partner_admin'});
 console.log(JSON.stringify({setup:view.decision.setupComplete,types:view.materials.map(m=>m.type),review:!!view.reviewToken}));
 const source=await loadArtifactSourceInput(db,slug);
 const {data:artifacts}=await db.from('partner_onboarding_artifacts').select('artifact_type,current_version_id').eq('workspace_id',source.workspace.id);
 for(const a of artifacts??[]){const {data:v}=await db.from('partner_onboarding_artifact_versions').select('normalized_snapshot,generator_version').eq('id',a.current_version_id).single();if(v)console.log(JSON.stringify({type:a.artifact_type,drift:detectArtifactDrift({storedSnapshot:v.normalized_snapshot,storedGeneratorVersion:v.generator_version,current:projectArtifactSource(a.artifact_type,source),currentGeneratorVersion:artifactGeneratorVersion(a.artifact_type,source)})}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
