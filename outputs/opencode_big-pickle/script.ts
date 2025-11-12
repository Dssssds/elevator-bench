import { Building } from './Building';
import { Direction } from './Elevator';

class ElevatorSimulator {
    private building: Building;
    private animationInterval: number | null = null;

    constructor() {
        this.building = new Building(10, 4);
        this.initializeDOM();
        this.startAnimation();
        this.setupEventListeners();
    }

    private initializeDOM(): void {
        const floorsContainer = document.getElementById('floors');
        const elevatorsContainer = document.getElementById('elevators');

        if (!floorsContainer || !elevatorsContainer) {
            return;
        }

        floorsContainer.innerHTML = '';
        elevatorsContainer.innerHTML = '';

        for (let i = this.building.totalFloors - 1; i >= 0; i--) {
            const floor = this.building.floors[i];
            const floorElement = this.createFloorElement(floor);
            floorsContainer.appendChild(floorElement);
        }

        for (let i = 0; i < this.building.totalElevators; i++) {
            const shaftElement = this.createElevatorShaftElement(i);
            elevatorsContainer.appendChild(shaftElement);
        }

        this.updateElevatorPositions();
    }

    private createFloorElement(floor: any): HTMLElement {
        const floorElement = document.createElement('div');
        floorElement.className = 'floor';
        floorElement.id = `floor-${floor.number}`;

        const floorNumber = document.createElement('div');
        floorNumber.className = 'floor-number';
        floorNumber.textContent = `F${floor.number}`;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'floor-buttons';

        if (floor.number < this.building.totalFloors - 1) {
            const upButton = document.createElement('button');
            upButton.className = 'floor-button up';
            upButton.textContent = '↑';
            upButton.addEventListener('click', () => {
                this.building.requestElevator(floor.number, Direction.UP);
            });
            buttonsContainer.appendChild(upButton);
            floor.upButton = upButton;
        }

        if (floor.number > 0) {
            const downButton = document.createElement('button');
            downButton.className = 'floor-button down';
            downButton.textContent = '↓';
            downButton.addEventListener('click', () => {
                this.building.requestElevator(floor.number, Direction.DOWN);
            });
            buttonsContainer.appendChild(downButton);
            floor.downButton = downButton;
        }

        floorElement.appendChild(floorNumber);
        floorElement.appendChild(buttonsContainer);
        floor.element = floorElement;

        return floorElement;
    }

    private createElevatorShaftElement(elevatorId: number): HTMLElement {
        const shaftElement = document.createElement('div');
        shaftElement.className = 'elevator-shaft';
        shaftElement.id = `shaft-${elevatorId}`;

        const elevatorElement = document.createElement('div');
        elevatorElement.className = 'elevator idle';
        elevatorElement.id = `elevator-${elevatorId}`;
        elevatorElement.textContent = `E${elevatorId}`;

        const panelElement = document.createElement('div');
        panelElement.className = 'elevator-panel';

        for (let i = 0; i < this.building.totalFloors; i++) {
            const floorButton = document.createElement('button');
            floorButton.className = 'elevator-floor-button';
            floorButton.textContent = i.toString();
            floorButton.addEventListener('click', () => {
                this.building.requestElevatorFloor(elevatorId, i);
            });
            panelElement.appendChild(floorButton);
        }

        elevatorElement.appendChild(panelElement);
        shaftElement.appendChild(elevatorElement);

        const elevator = this.building.elevators[elevatorId];
        elevator.element = elevatorElement;

        return shaftElement;
    }

    private updateElevatorPositions(): void {
        this.building.elevators.forEach(elevator => {
            if (elevator.element) {
                const bottomPosition = elevator.currentFloor * 62;
                elevator.element.style.bottom = `${bottomPosition}px`;

                elevator.element.className = `elevator ${elevator.state}`;

                const floorButtons = elevator.element.querySelectorAll('.elevator-floor-button');
                floorButtons.forEach((button, index) => {
                    if (elevator.hasDestination(index)) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                });
            }
        });
    }

    private startAnimation(): void {
        this.animationInterval = window.setInterval(() => {
            this.building.update();
            this.updateElevatorPositions();
        }, 1000);
    }

    private stopAnimation(): void {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }

    private setupEventListeners(): void {
        const resetButton = document.getElementById('resetBtn');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.reset();
            });
        }
    }

    public reset(): void {
        this.stopAnimation();
        this.building.reset();
        this.updateElevatorPositions();
        this.startAnimation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ElevatorSimulator();
});