These are the instructions to use this agent based control system for Fastory simulator

1. Start the simulator (not attached in submission)
2. Go to localhost:3000/fmw in browser
3. Go to folder /Programs
4. Open 3 command prompts
5. Start all 3 .js programs in command prompts
6. Go to localhost:4444 in browser
7. Write to frame field "1", "2" or "3"
8. Write to frame colour field "red", "green" or "blue"
9. Write to screen field "4", "5", or "6"
10 Write to screen colour field "red", "green" or "blue"
11. Write to keyboard field "7", "8" or "9"
12. Write to keyboard colour field "red", "green" or "blue"
13. Press Submit button
14. Look at the localhost:3000/fmv and enjoy!

There is a possibility that a pallet dont move from some station. Then use buttons in the
localhost:3000/fmv to move it to next conveyor. This might duplicate the pallet,in which case
easiest is to restart palletManager.js and WS.js. If duplication happens in paperloader ws,
then one might give the first pallet some head start before making the duplicate move forward. This
move allows the system to work correctly even with duplicate if duplicated stays behind the real one
and dont mess up its orders. There is a change that duplication happens already at pallet loading, which stays
hidden until paper loading or drawing phase, in whihc simulator starts working oddly. If this seems to happening then
restart the 2 programs.
