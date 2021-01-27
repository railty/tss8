call npm run build:svelte
git add .
git commit -m"update"
call npm version patch
call npm run publish

