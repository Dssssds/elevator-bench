// Configuration Constants
const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;
const FLOOR_HEIGHT = 60; // pixels per floor for animation
const MOVE_SPEED = 1000; // milliseconds per floor

// Types
enum Direction {
    UP = "UP",
    DOWN = "DOWN",
    IDLE = "IDLE"
}

enum ElevatorState {
    IDLE = "IDLE",
    MOVING = "MOVING"
}

interface FloorRequest {
    floor: number;
    direction: Direction;
}

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloors: Set<number>;
    state: ElevatorState;
    direction: Direction;
    element: HTMLElement;
}

// Global State
const elevators: Elevator[] = [];
const floorRequests: FloorRequest[] = [];

// Initialize the simulator
function init() {
    createFloorButtons();
    createElevators();
    createElevatorPanels();
    updateStatusDisplay();
    
    // Start the main loop
    setInterval(processRequests, 100);
}

// Create floor buttons (up/down for each floor)
function createFloorButtons() {
    const floorButtonsContainer = document.getElementById('floor-buttons')!;
    
    for (let floor = NUM_FLOORS - 1; floor >= 0; floor--) {
        const floorGroup = document.createElement('div');
        floorGroup.className = 'floor-button-group';
        
        const label = document.createElement('span');
        label.className = 'floor-label';
        label.textContent = `F${floor}`;
        floorGroup.appendChild(label);
        
        // Up button (not for top floor)
        if (floor < NUM_FLOORS - 1) {
            const upBtn = document.createElement('button');
            upBtn.className = 'floor-btn up';
            upBtn.textContent = '▲';
            upBtn.id = `floor-${floor}-up`;
            upBtn.onclick = () => requestElevator(floor, Direction.UP);
            floorGroup.appendChild(upBtn);
        }
        
        // Down button (not for ground floor)
        if (floor > 0) {
            const downBtn = document.createElement('button');
            downBtn.className = 'floor-btn down';
            downBtn.textContent = '▼';
            downBtn.id = `floor-${floor}-down`;
            downBtn.onclick = () => requestElevator(floor, Direction.DOWN);
            floorGroup.appendChild(downBtn);
        }
        
        floorButtonsContainer.appendChild(floorGroup);
    }
}

// Create elevator shafts and cars
function createElevators() {
    const elevatorsContainer = document.getElementById('elevators')!;
    
    for (let i = 0; i < NUM_ELEVATORS; i++) {
        const shaft = document.createElement('div');
        shaft.className = 'elevator-shaft';
        
        const header = document.createElement('div');
        header.className = 'elevator-shaft-header';
        header.textContent = `Elevator ${i}`;
        shaft.appendChild(header);
        
        const car = document.createElement('div');
        car.className = 'elevator-car';
        car.id = `elevator-${i}`;
        car.innerHTML = `
            <div class="elevator-car-info">
                <span class="elevator-current-floor">0</span>
                <span class="elevator-direction">IDLE</span>
            </div>
        `;
        
        shaft.appendChild(car);
        elevatorsContainer.appendChild(shaft);
        
        // Initialize elevator object
        elevators.push({
            id: i,
            currentFloor: 0,
            targetFloors: new Set(),
            state: ElevatorState.IDLE,
            direction: Direction.IDLE,
            element: car
        });
    }
}

// Create elevator interior control panels
function createElevatorPanels() {
    const panelsContainer = document.getElementById('elevator-panels')!;
    
    for (let i = 0; i < NUM_ELEVATORS; i++) {
        const panel = document.createElement('div');
        panel.className = 'elevator-panel';
        
        const title = document.createElement('h3');
        title.textContent = `Elevator ${i}`;
        panel.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'floor-buttons-grid';
        
        for (let floor = 0; floor < NUM_FLOORS; floor++) {
            const btn = document.createElement('button');
            btn.className = 'floor-destination-btn';
            btn.textContent = floor.toString();
            btn.id = `elevator-${i}-floor-${floor}`;
            btn.onclick = () => selectDestination(i, floor);
            grid.appendChild(btn);
        }
        
        panel.appendChild(grid);
        panelsContainer.appendChild(panel);
    }
}

// Request elevator from a floor
function requestElevator(floor: number, direction: Direction) {
    // Check if request already exists
    const exists = floorRequests.some(
        req => req.floor === floor && req.direction === direction
    );
    
    if (!exists) {
        floorRequests.push({ floor, direction });
        highlightFloorButton(floor, direction, true);
    }
}

// Select destination floor from inside elevator
function selectDestination(elevatorId: number, floor: number) {
    const elevator = elevators[elevatorId];
    
    if (elevator.currentFloor !== floor) {
        elevator.targetFloors.add(floor);
        highlightDestinationButton(elevatorId, floor, true);
        
        // If elevator is idle, start moving
        if (elevator.state === ElevatorState.IDLE) {
            determineDirection(elevator);
        }
    }
}

// Main request processing loop
function processRequests() {
    // Process each elevator
    elevators.forEach(elevator => {
        if (elevator.state === ElevatorState.IDLE && elevator.targetFloors.size > 0) {
            determineDirection(elevator);
            moveElevator(elevator);
        } else if (elevator.state === ElevatorState.IDLE && floorRequests.length > 0) {
            assignRequestToElevator();
        }
    });
    
    updateStatusDisplay();
}

// Assign floor request to the best available elevator
function assignRequestToElevator() {
    if (floorRequests.length === 0) return;
    
    const request = floorRequests[0];
    let bestElevator: Elevator | null = null;
    let minDistance = Infinity;
    
    for (const elevator of elevators) {
        if (elevator.state === ElevatorState.IDLE) {
            const distance = Math.abs(elevator.currentFloor - request.floor);
            if (distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        } else if (elevator.direction === request.direction || elevator.direction === Direction.IDLE) {
            // Check if elevator is moving in the right direction and will pass by
            const distance = Math.abs(elevator.currentFloor - request.floor);
            const willPassBy = 
                (elevator.direction === Direction.UP && elevator.currentFloor < request.floor) ||
                (elevator.direction === Direction.DOWN && elevator.currentFloor > request.floor);
            
            if (willPassBy && distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        }
    }
    
    if (bestElevator) {
        floorRequests.shift();
        bestElevator.targetFloors.add(request.floor);
        highlightFloorButton(request.floor, request.direction, false);
        
        if (bestElevator.state === ElevatorState.IDLE) {
            determineDirection(bestElevator);
        }
    }
}

// Determine which direction the elevator should move
function determineDirection(elevator: Elevator) {
    if (elevator.targetFloors.size === 0) {
        elevator.direction = Direction.IDLE;
        return;
    }
    
    const targets = Array.from(elevator.targetFloors).sort((a, b) => a - b);
    
    // If currently idle, go to the nearest floor
    if (elevator.direction === Direction.IDLE) {
        const nearest = targets.reduce((prev, curr) => {
            return Math.abs(curr - elevator.currentFloor) < Math.abs(prev - elevator.currentFloor) 
                ? curr 
                : prev;
        });
        
        elevator.direction = nearest > elevator.currentFloor ? Direction.UP : Direction.DOWN;
    }
    
    // Continue in current direction if there are floors ahead
    if (elevator.direction === Direction.UP) {
        const floorsAhead = targets.filter(f => f > elevator.currentFloor);
        if (floorsAhead.length === 0) {
            // Change direction if no more floors ahead
            elevator.direction = Direction.DOWN;
        }
    } else if (elevator.direction === Direction.DOWN) {
        const floorsAhead = targets.filter(f => f < elevator.currentFloor);
        if (floorsAhead.length === 0) {
            // Change direction if no more floors ahead
            elevator.direction = Direction.UP;
        }
    }
}

// Move elevator one floor at a time
function moveElevator(elevator: Elevator) {
    if (elevator.state === ElevatorState.MOVING) return;
    
    const targets = Array.from(elevator.targetFloors);
    if (targets.length === 0) {
        elevator.state = ElevatorState.IDLE;
        elevator.direction = Direction.IDLE;
        updateElevatorDisplay(elevator);
        return;
    }
    
    // Find next floor to visit based on current direction
    let nextFloor: number | null = null;
    
    if (elevator.direction === Direction.UP) {
        const floorsAbove = targets.filter(f => f > elevator.currentFloor).sort((a, b) => a - b);
        nextFloor = floorsAbove.length > 0 ? floorsAbove[0] : null;
    } else if (elevator.direction === Direction.DOWN) {
        const floorsBelow = targets.filter(f => f < elevator.currentFloor).sort((a, b) => b - a);
        nextFloor = floorsBelow.length > 0 ? floorsBelow[0] : null;
    }
    
    if (nextFloor === null) {
        determineDirection(elevator);
        if (elevator.targetFloors.size > 0) {
            moveElevator(elevator);
        }
        return;
    }
    
    elevator.state = ElevatorState.MOVING;
    
    // Move one floor at a time
    const floorsToMove = Math.abs(nextFloor - elevator.currentFloor);
    let currentStep = 0;
    
    const moveInterval = setInterval(() => {
        if (currentStep < floorsToMove) {
            if (elevator.direction === Direction.UP) {
                elevator.currentFloor++;
            } else {
                elevator.currentFloor--;
            }
            
            updateElevatorDisplay(elevator);
            currentStep++;
            
            // Check if we reached a target floor
            if (elevator.targetFloors.has(elevator.currentFloor)) {
                elevator.targetFloors.delete(elevator.currentFloor);
                highlightDestinationButton(elevator.id, elevator.currentFloor, false);
                
                // Brief stop at the floor
                clearInterval(moveInterval);
                setTimeout(() => {
                    elevator.state = ElevatorState.IDLE;
                    if (elevator.targetFloors.size > 0) {
                        determineDirection(elevator);
                        moveElevator(elevator);
                    } else {
                        elevator.direction = Direction.IDLE;
                        updateElevatorDisplay(elevator);
                    }
                }, 500);
            }
        } else {
            clearInterval(moveInterval);
            elevator.state = ElevatorState.IDLE;
            
            // Remove this floor from targets
            elevator.targetFloors.delete(elevator.currentFloor);
            highlightDestinationButton(elevator.id, elevator.currentFloor, false);
            
            if (elevator.targetFloors.size > 0) {
                determineDirection(elevator);
                moveElevator(elevator);
            } else {
                elevator.direction = Direction.IDLE;
                updateElevatorDisplay(elevator);
            }
        }
    }, MOVE_SPEED);
}

// Update elevator visual position and info
function updateElevatorDisplay(elevator: Elevator) {
    const position = elevator.currentFloor * FLOOR_HEIGHT;
    elevator.element.style.bottom = `${position}px`;
    
    const floorSpan = elevator.element.querySelector('.elevator-current-floor')!;
    const directionSpan = elevator.element.querySelector('.elevator-direction')!;
    
    floorSpan.textContent = elevator.currentFloor.toString();
    directionSpan.textContent = elevator.direction;
    
    if (elevator.state === ElevatorState.MOVING) {
        elevator.element.classList.add('moving');
    } else {
        elevator.element.classList.remove('moving');
    }
}

// Highlight/unhighlight floor request button
function highlightFloorButton(floor: number, direction: Direction, highlight: boolean) {
    const btnId = direction === Direction.UP 
        ? `floor-${floor}-up` 
        : `floor-${floor}-down`;
    const btn = document.getElementById(btnId);
    
    if (btn) {
        if (highlight) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// Highlight/unhighlight destination button
function highlightDestinationButton(elevatorId: number, floor: number, highlight: boolean) {
    const btn = document.getElementById(`elevator-${elevatorId}-floor-${floor}`);
    
    if (btn) {
        if (highlight) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// Update status display panel
function updateStatusDisplay() {
    const statusDisplay = document.getElementById('status-display')!;
    statusDisplay.innerHTML = '';
    
    elevators.forEach(elevator => {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'elevator-status';
        
        const targets = Array.from(elevator.targetFloors).sort((a, b) => a - b).join(', ');
        const statusClass = elevator.state === ElevatorState.IDLE ? 'status-idle' : 'status-moving';
        
        statusDiv.innerHTML = `
            <h4>Elevator ${elevator.id}</h4>
            <p>Current Floor: <strong>${elevator.currentFloor}</strong></p>
            <p>State: <span class="${statusClass}">${elevator.state}</span></p>
            <p>Direction: <strong>${elevator.direction}</strong></p>
            <p>Target Floors: ${targets || 'None'}</p>
        `;
        
        statusDisplay.appendChild(statusDiv);
    });
}

// Start the simulation when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
