# My experimental verification of the "Lonely Runner Conjecture"

## Usage

```
Sample runner velocities:
make; ./lrc.exe 1,2,3,4,5,6,7,9
make; ./lrc.exe 46,47,2103,2374,2466,3612,3678,3744
make; ./lrc.exe 236,237,1406,1545,1630,1867,2133,2415
make; ./lrc.exe 11,1,4,12,13,15,16,9
make; ./lrc.exe 0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.9

Using cheat (+1 runner):
make; ./lrc.exe 1,2,3,4,5,6,7,8,9 -c

Using random runner velocities:
make; ./lrc.exe -r

Using LrcTesting.cpp (instead of Lrc.cpp):
make; ./lrc.exe -t
```

Running the program with the cheat parameter and the runner velocities above will result in a runner NEVER being lonely. This doesn't disprove the conjecture since +1 runner is used, but it exemplifies what is described in the LaTeX document (see link at bottom).

## Example

![Example](example.png?raw=true "Example")

## LaTeX Document

[LRC.pdf](./LRC.pdf)

[Old YouTube Video](https://youtu.be/j-YvnLVk9kY)

[Old code](https://github.com/ornfelt/LRC)

[LRC Wikipedia](https://en.wikipedia.org/wiki/Lonely_runner_conjecture)