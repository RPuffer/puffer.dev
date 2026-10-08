cd /Users/pibbles/dev/puffer.dev-build/isoworld
export PP_PROFILE=.pp-profile-p10
B=http://localhost:8765
O=out/pass10/qa
node tools/qa-levels.mjs $B > $O/levels.txt 2>&1; echo "levels $?"
node tools/qa-visibility.mjs all --json $O/vis.json > $O/vis.txt 2>&1; echo "vis $?"
for n in $(node -e 'console.log(require("./levels/run.json").order.join(" "))'); do node tools/qa-things.mjs $B $n > $O/things-$n.txt 2>&1; echo "things $n $?"; done
node tools/qa-ride-keys.mjs > $O/ride-keys.txt 2>&1; echo "ride-keys $?"
node tools/qa-run.mjs $B > $O/run.txt 2>&1; echo "run $?"
node tools/qa.mjs $B > $O/qa.txt 2>&1; echo "qa $?"
echo DONE
