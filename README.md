# Advanced Duplicator Inspector
A single-page web application for viewing Gmod's Advanced Duplicator files

[Hosted on GitHub Pages](https://blakeoxx.github.io/adv-dupe-inspector/dist/)

[Powered by Subnet ROOT](https://www.subnetroot.com)


## Supported data types
- **Y:** dictionary entry
- **Z:** dictionary entry with escaped index (seems to be deprecated)
- **T:** table aka entity/constraint ID
- **P:** player
- **A:** angle (pitch,yaw,roll)
- **V:** vector (x,y,z)
- **B:** boolean (always loads as true?)
- **S:** string
- **N:** number


## What are heads?
One entity and one constraint are designated the main tables. Their IDs start with H. The main entity table assigns numeric IDs to top-level entities. One of these represents the head, referenced in the Info section.


## Things to test
- string containing double quote
- empty entities being removed
- head ID being changed in file header
- head ID being changed in edict list
- entity IDs being changed
- escaped dictionary indexes
- dictionary indexes out of order/with non-alphanumeric characters
