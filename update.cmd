call npm run build:svelte
git add .
git commit -m"update"
call npm version patch
rem call npm run publish
call npm run package

