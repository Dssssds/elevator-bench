// Configuration constants
const TOTAL_FLOORS = 10;
const TOTAL_ELEVATORS = 4;
const FLOOR_HEIGHT = 10; // Percentage of shaft height per floor
const MOVE_DURATION = 500; // Milliseconds per floor

// Types
type Direction = 'up' | 'down' | 'idle';
type ElevatorStatus = 'idle' | 'moving';

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloors: number[];
    direction: Direction;
    status: ElevatorStatus;
}

interface FloorRequest {
    floor: number;
    direction: 'up' | 'down';
}

// State
const elevators: Elevator[] = [];
const floorRequests: FloorRequest[] = [];
const activeFloorButtons: Set<string> = new Set();

// Initialize elevators
function initElevators(): void {
    for (let i = 0; i < TOTAL_ELEVATORS; i++) {
        elevators.push({
            id: i,
            currentFloor: 0,
            targetFloors: [],
            direction: 'idle',
            status: 'idle'
        });
    }
}

// UI Initialization
function initUI(): void {
    // Create floor buttons (from top floor to bottom)
    const floorButtonsContainer = document.getElementById('floorButtons');
    if (floorButtonsContainer) {
        for (let floor = TOTAL_FLOORS - 1; floor >= 0; floor--) {
            const floorRow = document.createElement('div');
            floorRow.className = 'floor-button-row';

            const floorLabel = document.createElement('div');
            floorLabel.className = 'floor-label';
            floorLabel.textContent = `Floor ${floor}`;
            floorRow.appendChild(floorLabel);

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'floor-button-group';

            // Top floor only has down button
            if (floor === TOTAL_FLOORS - 1) {
                const downBtn = createFloorButton(floor, 'down');
                buttonGroup.appendChild(downBtn);
            }
            // Bottom floor only has up button
            else if (floor === 0) {
                const upBtn = createFloorButton(floor, 'up');
                buttonGroup.appendChild(upBtn);
            }
            // Middle floors have both buttons
            else {
                const upBtn = createFloorButton(floor, 'up');
                const downBtn = createFloorButton(floor, 'down');
                buttonGroup.appendChild(upBtn);
                buttonGroup.appendChild(downBtn);
            }

            floorRow.appendChild(buttonGroup);
            floorButtonsContainer.appendChild(floorRow);
        }
    }

    // Create elevator panel buttons
    for (let elevatorId = 0; elevatorId < TOTAL_ELEVATORS; elevatorId++) {
        const panelButtons = document.getElementById(`elevator-buttons-${elevatorId}`);
        if (panelButtons) {
            for (let floor = 0; floor < TOTAL_FLOORS; floor++) {
                const button = document.createElement('button');
                button.className = 'elevator-button';
                button.textContent = `${floor}`;
                button.dataset.elevator = `${elevatorId}`;
                button.dataset.floor = `${floor}`;
                button.addEventListener('click', () => handleElevatorButtonClick(elevatorId, floor));
                panelButtons.appendChild(button);
            }
        }
    }
}

function createFloorButton(floor: number, direction: 'up' | 'down'): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `floor-button ${direction}`;
    button.textContent = direction === 'up' ? '↑' : '↓';
    button.dataset.floor = `${floor}`;
    button.dataset.direction = direction;
    button.addEventListener('click', () => handleFloorButtonClick(floor, direction));
    return button;
}

// Event Handlers
function handleFloorButtonClick(floor: number, direction: 'up' | 'down'): void {
    const buttonKey = `${floor}-${direction}`;

    // If request already exists, ignore
    if (activeFloorButtons.has(buttonKey)) {
        return;
    }

    // Add to active buttons
    activeFloorButtons.add(buttonKey);
    updateFloorButtonState(floor, direction, true);

    // Create request
    const request: FloorRequest = { floor, direction };

    // Try to assign to an elevator
    const assignedElevator = findBestElevator(request);

    if (assignedElevator) {
        assignRequestToElevator(assignedElevator, floor);
    } else {
        // Queue the request
        floorRequests.push(request);
    }
}

function handleElevatorButtonClick(elevatorId: number, floor: number): void {
    const elevator = elevators[elevatorId];

    // If already at that floor, ignore
    if (elevator.currentFloor === floor) {
        return;
    }

    // If already in target floors, ignore
    if (elevator.targetFloors.includes(floor)) {
        return;
    }

    // Add floor to targets
    assignRequestToElevator(elevator, floor);
    updateElevatorButtonState(elevatorId, floor, true);
}

// Elevator Logic
function findBestElevator(request: FloorRequest): Elevator | null {
    let bestElevator: Elevator | null = null;
    let minDistance = Infinity;

    for (const elevator of elevators) {
        // Check if elevator is idle
        if (elevator.status === 'idle') {
            const distance = Math.abs(elevator.currentFloor - request.floor);
            if (distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        }
        // Check if elevator is moving in the same direction and can pick up
        else if (elevator.direction === request.direction) {
            if (request.direction === 'up' && elevator.currentFloor < request.floor) {
                const distance = request.floor - elevator.currentFloor;
                if (distance < minDistance) {
                    minDistance = distance;
                    bestElevator = elevator;
                }
            } else if (request.direction === 'down' && elevator.currentFloor > request.floor) {
                const distance = elevator.currentFloor - request.floor;
                if (distance < minDistance) {
                    minDistance = distance;
                    bestElevator = elevator;
                }
            }
        }
    }

    return bestElevator;
}

function assignRequestToElevator(elevator: Elevator, floor: number): void {
    // Add floor to target floors
    elevator.targetFloors.push(floor);

    // Sort target floors based on current direction
    sortTargetFloors(elevator);

    // If elevator is idle, start moving
    if (elevator.status === 'idle') {
        startElevatorMovement(elevator);
    }
}

function sortTargetFloors(elevator: Elevator): void {
    const current = elevator.currentFloor;

    // Separate floors into those above and below current floor
    const floorsAbove = elevator.targetFloors.filter(f => f > current).sort((a, b) => a - b);
    const floorsBelow = elevator.targetFloors.filter(f => f < current).sort((a, b) => b - a);

    // If currently moving up or idle with floors above, prioritize going up first
    if (elevator.direction === 'up' || (elevator.direction === 'idle' && floorsAbove.length > 0)) {
        elevator.targetFloors = [...floorsAbove, ...floorsBelow];
        if (floorsAbove.length > 0) {
            elevator.direction = 'up';
        }
    }
    // Otherwise prioritize going down
    else {
        elevator.targetFloors = [...floorsBelow, ...floorsAbove];
        if (floorsBelow.length > 0) {
            elevator.direction = 'down';
        }
    }
}

function startElevatorMovement(elevator: Elevator): void {
    if (elevator.targetFloors.length === 0) {
        elevator.status = 'idle';
        elevator.direction = 'idle';
        updateElevatorUI(elevator);
        checkPendingRequests();
        return;
    }

    const nextFloor = elevator.targetFloors[0];
    const distance = Math.abs(nextFloor - elevator.currentFloor);

    elevator.status = 'moving';

    // Determine direction
    if (nextFloor > elevator.currentFloor) {
        elevator.direction = 'up';
    } else if (nextFloor < elevator.currentFloor) {
        elevator.direction = 'down';
    }

    updateElevatorUI(elevator);

    // Animate movement
    const moveDuration = distance * MOVE_DURATION;
    setTimeout(() => {
        moveElevatorToFloor(elevator, nextFloor);
    }, moveDuration);
}

function moveElevatorToFloor(elevator: Elevator, floor: number): void {
    elevator.currentFloor = floor;
    elevator.targetFloors.shift(); // Remove the reached floor

    // Clear floor request button if this was a pickup
    clearFloorRequest(floor, elevator.direction);

    // Clear elevator button
    updateElevatorButtonState(elevator.id, floor, false);

    // Update UI
    updateElevatorUI(elevator);

    // Continue to next floor or become idle
    setTimeout(() => {
        startElevatorMovement(elevator);
    }, 500); // Small pause at each floor
}

function clearFloorRequest(floor: number, direction: Direction): void {
    if (direction === 'idle') return;

    const buttonKey = `${floor}-${direction}`;
    if (activeFloorButtons.has(buttonKey)) {
        activeFloorButtons.delete(buttonKey);
        updateFloorButtonState(floor, direction, false);
    }

    // Remove from pending requests
    const index = floorRequests.findIndex(r => r.floor === floor && r.direction === direction);
    if (index !== -1) {
        floorRequests.splice(index, 1);
    }
}

function checkPendingRequests(): void {
    // Try to assign pending requests to available elevators
    for (let i = floorRequests.length - 1; i >= 0; i--) {
        const request = floorRequests[i];
        const elevator = findBestElevator(request);

        if (elevator) {
            assignRequestToElevator(elevator, request.floor);
            floorRequests.splice(i, 1);
        }
    }
}

// UI Updates
function updateElevatorUI(elevator: Elevator): void {
    const elevatorEl = document.getElementById(`elevator-${elevator.id}`);
    if (elevatorEl) {
        // Update position (bottom percentage)
        const bottomPosition = elevator.currentFloor * FLOOR_HEIGHT + 0.5;
        elevatorEl.style.bottom = `${bottomPosition}%`;

        // Update status
        const statusEl = elevatorEl.querySelector('.elevator-status');
        if (statusEl) {
            statusEl.textContent = elevator.status === 'idle'
                ? 'Idle'
                : `Moving ${elevator.direction}`;
        }

        // Update floor display
        const floorEl = elevatorEl.querySelector('.elevator-floor');
        if (floorEl) {
            floorEl.textContent = `Floor: ${elevator.currentFloor}`;
        }

        // Update class for styling
        if (elevator.status === 'moving') {
            elevatorEl.classList.add('moving');
        } else {
            elevatorEl.classList.remove('moving');
        }
    }
}

function updateFloorButtonState(floor: number, direction: 'up' | 'down', active: boolean): void {
    const buttons = document.querySelectorAll(
        `.floor-button[data-floor="${floor}"][data-direction="${direction}"]`
    );
    buttons.forEach(button => {
        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function updateElevatorButtonState(elevatorId: number, floor: number, active: boolean): void {
    const button = document.querySelector(
        `.elevator-button[data-elevator="${elevatorId}"][data-floor="${floor}"]`
    );
    if (button) {
        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initElevators();
    initUI();

    // Initial UI update
    elevators.forEach(elevator => updateElevatorUI(elevator));
});
