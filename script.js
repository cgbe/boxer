document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("grid-container");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.classList.add("grid-overlay");
    gridContainer.appendChild(canvas);
    let isDragging = false;
    let isResizing = false;
    let isMoving = false;
    let isSelectMode = false;
    let isCssMode = false;
    let startX, startY, endX, endY;
    let selectedBlock = null;
    let selectedHandleDirection = null;
    let blocks = []; // Root blocks
    let history = [];
    let redoStack = [];
    const blockTypeSelector = document.getElementById("block-type");
    const selectModeButton = document.getElementById("select-toggle");
    const cssModeButton = document.getElementById("css-toggle");
    const undoButton = document.getElementById("undo");
    const redoButton = document.getElementById("redo");
    const clearButton = document.getElementById("clear");
    const saveButton = document.getElementById("save");
    const jsonOutput = document.getElementById("json-output");
    const gridSizeInput = document.getElementById("grid-size");
    const canvasSizeInput = document.getElementById("canvas-size");
    const savedLayoutsTable = document.getElementById("saved-layouts").getElementsByTagName('tbody')[0];
    const cssEditorTextarea = document.getElementById("css-editor");
    const applyCssButton = document.getElementById("apply-css");
    const cssEditor = CodeMirror.fromTextArea(cssEditorTextarea, {
        mode: "css",
        theme: "github",
        lineNumbers: true,
        tabSize: 2,
        indentWithTabs: false,
        lineWrapping: true,
    });

    function updateCanvasSize() {
        const newWidth = Math.max(Math.min(canvasSizeInput.value, canvasSizeInput.max), canvasSizeInput.min);
        const newHeight = newWidth * 1.5; // Aspect ratio
        gridContainer.style.width = `${newWidth}px`;
        gridContainer.style.height = `${newHeight}px`;
        canvas.width = newWidth;
        canvas.height = newHeight;
        drawGrid();
        saveState();
        updateJSONLog();
    }

    updateCanvasSize();
    canvasSizeInput.addEventListener("change", () => {
        updateCanvasSize();
    });
    gridSizeInput.addEventListener("change", () => {
        drawGrid();
        saveState();
        updateJSONLog();
    });
    selectModeButton.addEventListener("click", () => {
        isSelectMode = !isSelectMode;
        isCssMode = false;
        selectModeButton.classList.toggle("active", isSelectMode);
        cssModeButton.classList.remove("active");
        if (!isSelectMode) {
            deselectAllBlocks();
        }
    });
    cssModeButton.addEventListener("click", () => {
        isCssMode = !isCssMode;
        isSelectMode = false;
        cssModeButton.classList.toggle("active", isCssMode);
        selectModeButton.classList.remove("active");
        if (!isCssMode) {
            cssEditor.setValue('');
            deselectAllBlocks();
        }
    });

    undoButton.addEventListener("click", undo);
    redoButton.addEventListener("click", redo);
    clearButton.addEventListener("click", clearGrid);
    saveButton.addEventListener("click", saveLayout);
    applyCssButton.addEventListener("click", applyCustomCss);

    gridContainer.addEventListener("mousedown", (e) => {
        if (isCssMode || isSelectMode) return;
        isDragging = true;
        const rect = gridContainer.getBoundingClientRect();
        startX = snapToGrid(e.clientX - rect.left);
        startY = snapToGrid(e.clientY - rect.top);
    });

    gridContainer.addEventListener("mousemove", (e) => {
        if (isDragging) {
            const rect = gridContainer.getBoundingClientRect();
            endX = snapToGrid(e.clientX - rect.left);
            endY = snapToGrid(e.clientY - rect.top);
            drawGrid();
            drawSelection(startX, startY, endX, endY);
        }
    });

    gridContainer.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            if (startX !== endX && startY !== endY) {
                addBlock(startX, startY, endX, endY);
                drawGrid();
                saveState();
                updateJSONLog();
            }
        }
    });

    gridContainer.addEventListener("click", (e) => {
        const blockElement = e.target.closest(".block");
        if (blockElement) {
            if (isCssMode) {
                selectBlockForCss(blockElement);
            } else if (isSelectMode) {
                selectBlock(blockElement);
            }
        } else {
            deselectAllBlocks();
        }
    });
    gridContainer.addEventListener("dragstart", (e) => e.preventDefault());

    /**
     * draws the grid on the canvas.
     */
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const gridSize = parseInt(gridSizeInput.value);

        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    /**
     * draws a selection rectangle on the grid.
     * @param {number} x1 - Starting X coordinate.
     * @param {number} y1 - Starting Y coordinate.
     * @param {number} x2 - Ending X coordinate.
     * @param {number} y2 - Ending Y coordinate.
     */
    function drawSelection(x1, y1, x2, y2) {
        ctx.strokeStyle = "#0078d7";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }

    /**
     * Snaps a value to the nearest grid increment.
     * @param {number} value - The value to snap.
     * @returns {number} - The snapped value.
     */
    function snapToGrid(value) {
        const gridSize = parseInt(gridSizeInput.value);
        return Math.round(value / gridSize) * gridSize;
    }

    /**
     * generates a random two-character string.
     * @returns {string} - The generated string.
     */
    function generateRandomName() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return chars.charAt(Math.floor(Math.random() * chars.length)) +
            chars.charAt(Math.floor(Math.random() * chars.length));
    }

    /**
     * generates a unique block name.
     * @param {string} type - The type of the block.
     * @param {string} parentName - The name of the parent block.
     * @returns {string} - The generated block name.
     */
    function generateBlockName(type, parentName = '') {
        const randomName = generateRandomName();
        let blockName = `${randomName}-${type}`;
        if (parentName) {
            blockName = `${parentName}.${blockName}`;
        }
        return blockName;
    }

    /**
     * adds a new block to the grid.
     * @param {number} x1 - Starting X coordinate.
     * @param {number} y1 - Starting Y coordinate.
     * @param {number} x2 - Ending X coordinate.
     * @param {number} y2 - Ending Y coordinate.
     */
    function addBlock(x1, y1, x2, y2) {
        const blockType = blockTypeSelector.value;
        const color = getBlockColor(blockType);

        const parentBlockName = isSelectMode && selectedBlock ? selectedBlock.getAttribute('data-name') : '';
        const blockName = generateBlockName(blockType, parentBlockName);

        const blockElement = document.createElement("div");
        blockElement.classList.add("block", blockType);
        blockElement.style.left = `${Math.min(x1, x2)}px`;
        blockElement.style.top = `${Math.min(y1, y2)}px`;
        blockElement.style.width = `${Math.abs(x2 - x1)}px`;
        blockElement.style.height = `${Math.abs(y2 - y1)}px`;
        blockElement.setAttribute("data-id", `block-${Date.now()}`);
        blockElement.setAttribute("data-type", blockType);
        blockElement.setAttribute("data-name", blockName);
        blockElement.style.backgroundColor = color;

        if (isSelectMode && selectedBlock) {
            blockElement.style.position = "absolute";
            selectedBlock.appendChild(blockElement);
            const parentBlockData = findBlockData(selectedBlock.getAttribute('data-id'));
            const newBlockData = createBlockData(blockElement, 0, 0, Math.abs(x2 - x1), Math.abs(y2 - y1), blockType, color, blockName);
            parentBlockData.children.push(newBlockData);
        } else {
            gridContainer.appendChild(blockElement);
            blocks.push(createBlockData(blockElement, Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), blockType, color, blockName));
        }

        addInfoBox(blockElement, blockType, blockName);
        attachBlockEvents(blockElement);
    }

    /**
     * creates a block data object.
     * @param {HTMLElement} element - The block element.
     * @param {number} startX - Starting X coordinate.
     * @param {number} startY - Starting Y coordinate.
     * @param {number} width - Width of the block.
     * @param {number} height - Height of the block.
     * @param {string} type - Type of the block.
     * @param {string} color - Background color of the block.
     * @param {string} name - Unique name of the block.
     * @returns {object} - The block data object.
     */
    function createBlockData(element, startX, startY, width, height, type, color, name) {
        return {
            id: element.getAttribute('data-id'),
            type: type,
            name: name,
            color: color,
            startX: startX,
            startY: startY,
            width: width,
            height: height,
            css: {}, // To store custom CSS properties
            children: []
        };
    }

    /**
     * finds block data by ID.
     * @param {string} id - The ID of the block.
     * @param {Array} blockArray - The array of blocks to search.
     * @returns {object|null} - The block data or null if not found.
     */
    function findBlockData(id, blockArray = blocks) {
        for (let block of blockArray) {
            if (block.id === id) {
                return block;
            }
            const child = findBlockData(id, block.children);
            if (child) return child;
        }
        return null;
    }

    /**
     * adds an info box to a block.
     * @param {HTMLElement} blockElement - The block element.
     * @param {string} blockType - The type of the block.
     * @param {string} blockName - The unique name of the block.
     */
    function addInfoBox(blockElement, blockType, blockName) {
        const infoBox = document.createElement("div");
        infoBox.classList.add("info-box", `info-${blockType}`);
        infoBox.innerText = `${blockName}\n${blockElement.style.width} x ${blockElement.style.height}`;
        blockElement.appendChild(infoBox);
        positionInfoBox(blockElement, infoBox);
    }

    /**
     * positions the info box at the top-left corner of the block.
     * @param {HTMLElement} blockElement - The block element.
     * @param {HTMLElement} infoBox - The info box element.
     */
    function positionInfoBox(blockElement, infoBox) {
        infoBox.style.left = "0";
        infoBox.style.top = "0";
    }

    /**
     * selects a block for movement and resizing.
     * @param {HTMLElement} blockElement - The block element.
     */
    function selectBlock(blockElement) {
        deselectAllBlocks();
        selectedBlock = blockElement;
        blockElement.classList.add("selected");
        addResizeHandles(blockElement);
        loadBlockCss(blockElement);
    }
        
    /** -- unser construction --
     * selects a block for CSS editing.
     * @param {HTMLElement} blockElement - The block element.
     */
    function selectBlockForCss(blockElement) {
        deselectAllBlocks();
        selectedBlock = blockElement;
        blockElement.classList.add("css-selected");
        const blockName = blockElement.getAttribute('data-name');
        const id = blockElement.getAttribute('data-id');
        const blockData = findBlockData(id);

        let existingCss = blockData.cssString || `#${blockName} {\n    display: ${getDisplayStyle(blockData.type)};\n}\n`;
        cssEditor.setValue(existingCss);
    }

    /**
     * deselects all blocks and clears selections.
     */
    function deselectAllBlocks() {
        document.querySelectorAll(".block").forEach(block => {
            block.classList.remove("selected");
            block.classList.remove("css-selected");
            removeResizeHandles(block);
        });
        selectedBlock = null;
        if (!isCssMode) {
            cssEditor.setValue('');
        }
    }

    /**
     * adds resize handles to a block.
     * @param {HTMLElement} blockElement - The block element.
     */
    function addResizeHandles(blockElement) {
        ["nw", "ne", "sw", "se"].forEach(direction => {
            const handle = document.createElement("div");
            handle.classList.add("resize-handle", direction);
            handle.addEventListener("mousedown", (e) => startResizeBlock(e, direction));
            blockElement.appendChild(handle);
        });
    }

    /**
     * removes resize handles from a block.
     * @param {HTMLElement} blockElement - The block element.
     */
    function removeResizeHandles(blockElement) {
        blockElement.querySelectorAll(".resize-handle").forEach(handle => {
            handle.removeEventListener("mousedown", startResizeBlock);
            blockElement.removeChild(handle);
        });
    }

    /**
     * attaches event listeners to a block for selection and movement.
     * @param {HTMLElement} blockElement - The block element.
     */
    function attachBlockEvents(blockElement) {
        blockElement.addEventListener("mousedown", (e) => {
            if (isCssMode) return;
            if (!isSelectMode) return;
            e.stopPropagation();
            selectBlock(blockElement);
            startMoveBlock(e, blockElement);
        });
    }

    /**
     * starts the move operation for a block.
     * @param {MouseEvent} e - The mouse event.
     * @param {HTMLElement} blockElement - The block element.
     */
    function startMoveBlock(e, blockElement) {
        if (!isSelectMode) return;
        isMoving = true;
        const rect = gridContainer.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        const initialLeft = parseInt(blockElement.style.left);
        const initialTop = parseInt(blockElement.style.top);

        /**
         * handwes the movement of the block during drag.
         * @param {MouseEvent} eMove - The mouse move event.
         */
        function moveBlock(eMove) {
            if (!isMoving) return;
            const dx = snapToGrid(eMove.clientX - startX);
            const dy = snapToGrid(eMove.clientY - startY);
            blockElement.style.left = `${initialLeft + dx}px`;
            blockElement.style.top = `${initialTop + dy}px`;
            updateBlockData(blockElement);
            updateJSONLog();
        }

        /**
         * stops the move operation.
         */
        function stopMoveBlock() {
            isMoving = false;
            document.removeEventListener("mousemove", moveBlock);
            document.removeEventListener("mouseup", stopMoveBlock);
            saveState();
        }

        document.addEventListener("mousemove", moveBlock);
        document.addEventListener("mouseup", stopMoveBlock);
    }

    /**
     * starts the resize operation for a block.
     * @param {MouseEvent} e - The mouse event.
     * @param {string} direction - The direction of the resize handle.
     */
    function startResizeBlock(e, direction) {
        if (!isSelectMode) return;
        isResizing = true;
        selectedHandleDirection = direction;
        const blockElement = e.target.parentElement;
        startX = e.clientX;
        startY = e.clientY;
        const initialWidth = parseInt(blockElement.style.width);
        const initialHeight = parseInt(blockElement.style.height);
        const initialLeft = parseInt(blockElement.style.left);
        const initialTop = parseInt(blockElement.style.top);

        /**
         * handles the resizing of the block during drag.
         * @param {MouseEvent} eResize - The mouse move event.
         */
        function resizeBlock(eResize) {
            if (!isResizing) return;
            let dx = snapToGrid(eResize.clientX - startX);
            let dy = snapToGrid(eResize.clientY - startY);
            let newWidth = initialWidth;
            let newHeight = initialHeight;
            let newLeft = initialLeft;
            let newTop = initialTop;

            if (selectedHandleDirection.includes('e')) {
                newWidth = initialWidth + dx;
            }
            if (selectedHandleDirection.includes('s')) {
                newHeight = initialHeight + dy;
            }
            if (selectedHandleDirection.includes('w')) {
                newWidth = initialWidth - dx;
                newLeft = initialLeft + dx;
            }
            if (selectedHandleDirection.includes('n')) {
                newHeight = initialHeight - dy;
                newTop = initialTop + dy;
            }

            // Minimum size check
            const gridSize = parseInt(gridSizeInput.value);
            newWidth = newWidth >= gridSize ? newWidth : gridSize;
            newHeight = newHeight >= gridSize ? newHeight : gridSize;

            blockElement.style.width = `${newWidth}px`;
            blockElement.style.height = `${newHeight}px`;
            blockElement.style.left = `${newLeft}px`;
            blockElement.style.top = `${newTop}px`;

            updateBlockData(blockElement);
            updateJSONLog();
        }

        /**
         * stops the resize operation.
         */
        function stopResizeBlock() {
            isResizing = false;
            selectedHandleDirection = null;
            document.removeEventListener("mousemove", resizeBlock);
            document.removeEventListener("mouseup", stopResizeBlock);
            saveState();
        }

        document.addEventListener("mousemove", resizeBlock);
        document.addEventListener("mouseup", stopResizeBlock);
        e.stopPropagation();
    }

    /**
     * updates the block data after movement or resizing.
     * @param {HTMLElement} blockElement - The block element.
     */
    function updateBlockData(blockElement) {
        const id = blockElement.getAttribute('data-id');
        const blockData = findBlockData(id);
        if (!blockData) return;

        blockData.startX = parseInt(blockElement.style.left);
        blockData.startY = parseInt(blockElement.style.top);
        blockData.width = parseInt(blockElement.style.width);
        blockData.height = parseInt(blockElement.style.height);

        // Update children recursively
        blockElement.querySelectorAll(".block").forEach(child => {
            updateBlockData(child);
        });
    }

    /**
     * updates the JSON log with the current layout.
     */
    function updateJSONLog() {
        function buildJson(blockArray) {
            return blockArray.map(block => ({
                type: block.type,
                id: block.id,
                name: block.name,
                styles: {
                    position: "absolute",
                    left: block.startX + "px",
                    top: block.startY + "px",
                    width: block.width + "px",
                    height: block.height + "px",
                    backgroundColor: block.color,
                    display: getDisplayStyle(block.type),
                    ...block.css // Spread custom CSS properties
                },
                children: block.children.length > 0 ? buildJson(block.children) : undefined
            }));
        }

        const jsonStructure = { elements: buildJson(blocks) };
        jsonOutput.innerText = JSON.stringify(jsonStructure, null, 2);
    }

    /**
     * saves current state to history
     */
    function saveState() {
        const blocksState = JSON.stringify(blocks);
        history.push(blocksState);
        redoStack = [];
    }

    /**
     * undo
     */
    function undo() {
        if (history.length > 1) {
            redoStack.push(history.pop());
            const previousState = JSON.parse(history[history.length - 1]);
            restoreState(previousState);
            updateJSONLog();
        }
    }

    /**
     * redo
     */
    function redo() {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            history.push(nextState);
            const state = JSON.parse(nextState);
            restoreState(state);
            updateJSONLog();
        }
    }

    /**
     * restores the layout state from a given state object.
     * @param {object} state - The state object to restore.
     */
    function restoreState(state) {
        blocks = state;
        gridContainer.querySelectorAll(".block").forEach(block => block.remove());
        blocks.forEach(block => {
            createBlockElement(block, gridContainer);
        });
    }

    /**
     * creates a block element in the DOM based on block data.
     * @param {object} blockData - The data of the block.
     * @param {HTMLElement} parentElement - The parent element to append the block to.
     */
    function createBlockElement(blockData, parentElement) {
        const blockElement = document.createElement("div");
        blockElement.classList.add("block", blockData.type);
        blockElement.style.left = `${blockData.startX}px`;
        blockElement.style.top = `${blockData.startY}px`;
        blockElement.style.width = `${blockData.width}px`;
        blockElement.style.height = `${blockData.height}px`;
        blockElement.setAttribute("data-id", blockData.id);
        blockElement.setAttribute("data-type", blockData.type);
        blockElement.setAttribute("data-name", blockData.name);
        blockElement.style.backgroundColor = blockData.color;

        // apply custom CSS if any
        if (blockData.css && Object.keys(blockData.css).length > 0) {
            Object.entries(blockData.css).forEach(([key, value]) => {
                blockElement.style[key.trim()] = value.trim();
            });
        }

        parentElement.appendChild(blockElement);

        addInfoBox(blockElement, blockData.type, blockData.name);
        attachBlockEvents(blockElement);

        if (blockData.children && blockData.children.length > 0) {
            blockData.children.forEach(childBlock => {
                createBlockElement(childBlock, blockElement);
            });
        }
    }

    /**
     * clears the entire grid after user confirmation.
     */
    function clearGrid() {
        if (confirm("Are you sure you want to clear the grid? This action cannot be undone.")) {
            blocks = [];
            gridContainer.innerHTML = '';
            gridContainer.appendChild(canvas);
            drawGrid();
            saveState();
            updateJSONLog();
        }
    }

    /**
     * saves the current layout to local browser storage
     */
    function saveLayout() {
        const layoutName = prompt("Enter a name for the layout:", `Layout ${savedLayoutsTable.rows.length + 1}`);
        if (!layoutName) return;

        const layoutData = {
            name: layoutName,
            timestamp: new Date().toLocaleString(),
            data: blocks
        };

        let savedLayouts = JSON.parse(localStorage.getItem("savedLayouts")) || [];
        savedLayouts.push(layoutData);
        localStorage.setItem("savedLayouts", JSON.stringify(savedLayouts));

        addLayoutToTable(layoutData);
    }

    /**
     * loads saved layouts from local storage.
     */
    function loadSavedLayouts() {
        const savedLayouts = JSON.parse(localStorage.getItem("savedLayouts")) || [];
        savedLayouts.forEach(layout => {
            addLayoutToTable(layout);
        });
    }

    /**
     * adds a saved layout to the saved layouts table.
     * todo - integrate a db to store this stuff, but until then were using local storage in the browser.
     * @param {object} layoutData - The data of the saved layout.
     */w
    function addLayoutToTable(layoutData) {
        const row = savedLayoutsTable.insertRow();
        const cellName = row.insertCell(0);
        const cellActions = row.insertCell(1);

        cellName.innerText = `${layoutData.name} (${layoutData.timestamp})`;

        const loadButton = document.createElement("button");
        loadButton.innerText = "Load";
        loadButton.classList.add("table-btn");
        loadButton.addEventListener("click", () => {
            if (confirm(`Load layout "${layoutData.name}"? This will overwrite the current grid.`)) {
                blocks = JSON.parse(JSON.stringify(layoutData.data)); // Deep copy
                gridContainer.querySelectorAll(".block").forEach(block => block.remove());
                blocks.forEach(block => {
                    createBlockElement(block, gridContainer);
                });
                drawGrid();
                saveState();
                updateJSONLog();
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete";
        deleteButton.classList.add("table-btn");
        deleteButton.addEventListener("click", () => {
            if (confirm(`Delete layout "${layoutData.name}"? This action cannot be undone.`)) {
                let savedLayouts = JSON.parse(localStorage.getItem("savedLayouts")) || [];
                savedLayouts = savedLayouts.filter(layout => layout.name !== layoutData.name);
                localStorage.setItem("savedLayouts", JSON.stringify(savedLayouts));
                savedLayoutsTable.deleteRow(row.rowIndex - 1);
            }
        });

        cellActions.appendChild(loadButton);
        cellActions.appendChild(deleteButton);
    }

    loadSavedLayouts();

    /**
     * applies custom CSS from the CSS editor to the selected block.
     */
    function applyCustomCss() {
        if (!selectedBlock) return;
        const cssString = cssEditor.getValue();
        const id = selectedBlock.getAttribute('data-id');
        const blockData = findBlockData(id);
        if (blockData) {
            const regex = new RegExp(`#${blockData.name}\\s*{([^}]*)}`, 'i');
            const match = cssString.match(regex);
            if (match && match[1]) {
                const cssContent = match[1];
                const cssObject = convertCssStringToObject(cssContent);
                blockData.css = cssObject;
                blockData.cssString = cssString;
                Object.entries(cssObject).forEach(([key, value]) => {
                    selectedBlock.style[key.trim()] = value.trim();
                });
                updateJSONLog();
            }
        }
    }

    /**
     * Converts a CSS string to a CSS object.
     * @param {string} cssString - The CSS string.
     * @returns {object} - The CSS object.
     */
    function convertCssStringToObject(cssString) {
        const cssObject = {};
        cssString.split(";").forEach(rule => {
            const [property, value] = rule.split(":").map(item => item.trim());
            if (property && value) {
                cssObject[property] = value;
            }
        });
        return cssObject;
    }

    /**
     * Retrieves the display style based on the block type.
     * @param {string} blockType - The type of the block.
     * @returns {string} - The display style.
     */
    function getDisplayStyle(blockType) {
        switch (blockType) {
            case "span":
                return "inline";
            case "div":
                return "block";
            case "flex":
                return "flex";
            case "block":
                return "block";
            default:
                return "block";
        }
    }

    /**
     * retrieves the background color based on the block type.
     * @param {string} blockType - The type of the block.
     * @returns {string} - The background color.
     */
    function getBlockColor(blockType) {
        switch (blockType) {
            case "span":
                return "rgba(255, 99, 71, 0.5)";
            case "div":
                return "rgba(173, 216, 230, 0.5)";
            case "flex":
                return "rgba(144, 238, 144, 0.5)";
            case "block":
                return "rgba(255, 228, 181, 0.5)";
            default:
                return "rgba(255, 255, 255, 0.5)";
        }
    }
    // STATE
    saveState();
    updateJSONLog();
});
