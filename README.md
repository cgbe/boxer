# Boxer
A simple box model editor I made to help with layout planning.

![2D-wireframe-generator--Boxer_main_interface](https://github.com/user-attachments/assets/e3f360cf-4a19-4256-aedd-ad2b2eaebe83)
*Design layouts visually with an intuitive grid system*

## What it does
Draw boxes on a grid, nest them, and get the corresponding HTML/CSS structure. Built this mainly to help visualize layouts before coding them.

## Features

### Box Creation & Nesting
![2D-wireframe-generator--Boxer_nesting](https://github.com/user-attachments/assets/8260b261-c367-4ece-95c7-dff3fff13ce8)
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

## JSON Preview
![JSON preview](https://github.com/cgbe/boxer/assets/screenshots/json.png)
*Real-time JSON output of your layout structure*

Built with vanilla JS. Feel free to use/modify!
