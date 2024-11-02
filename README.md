# Boxer
Draw boxes on a grid, nest them, and get the corresponding JSON structure. Built this mainly for generating JSON to feed a chatbot to get a starting layout for prototyping.

![2D-wireframe-generator--Boxer_main_interface](https://github.com/user-attachments/assets/0a4ecdc6-a4ad-4e51-80a6-f7b41942d4ec)
*Design layouts visually with an intuitive grid system*

## Features

### Box Creation & Nesting
![2D-wireframe-generator--Boxer_nesting](https://github.com/user-attachments/assets/fc45c433-e787-4b7e-b49a-269957a4643e)
*Click and drag to resize boxes, nest them for complex layouts*

- Click & drag to create boxes
- Nest elements 
- Real-time JSON output
- Local saves
- CSS editor
- Undo/redo

## Box Types
```css
div   { background: lightblue; }  # Standard block
span  { background: tomato; }     # Inline element
flex  { background: lightgreen; } # Flexbox container
block { background: moccasin; }   # Block element
```

## Usage
1. Click and drag to create boxes
2. Use select mode to move/resize
3. CSS mode to customize styles
4. Local saves to keep your work

## Example Output
```json
{
 "elements": [{
   "type": "div",
   "name": "ab-div",
   "styles": {
     "position": "absolute",
     "left": "100px", 
     "top": "50px",
     "width": "200px",
     "height": "100px"
   }
 }]
}
```

Built with vanilla JS. Feel free to use/modify!
