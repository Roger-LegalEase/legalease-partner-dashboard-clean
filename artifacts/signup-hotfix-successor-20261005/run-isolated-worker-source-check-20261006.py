import os,pathlib,subprocess
root='/tmp/expai-signup-production-20261005'
out=pathlib.Path('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005/isolated-participant-assembly-20261006.log')
with out.open('wb') as f:
    r=subprocess.run(['node','scripts/verify-participant-packet-assembly.mjs'],cwd=root,env={'PATH':os.environ['PATH'],'NODE_ENV':'test'},stdout=f,stderr=subprocess.STDOUT)
print({'exitCode':r.returncode,'configuration':'Clean environment: PATH and NODE_ENV=test only; no service credentials provided','evidence':str(out)})
raise SystemExit(r.returncode)
