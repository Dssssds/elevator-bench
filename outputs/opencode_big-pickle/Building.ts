import { Elevator, Direction, FloorRequest, ElevatorState } from './Elevator';
import { Floor } from './Floor';

export class Building {
    public floors: Floor[];
    public elevators: Elevator[];
    public pendingRequests: FloorRequest[] = [];
    public readonly totalFloors: number;
    public readonly totalElevators: number;

    constructor(totalFloors: number = 10, totalElevators: number = 4) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        
        this.floors = Array.from({ length: totalFloors }, (_, i) => new Floor(i));
        this.elevators = Array.from({ length: totalElevators }, (_, i) => new Elevator(i));
    }

    public requestElevator(floorNumber: number, direction: Direction): void {
        if (floorNumber < 0 || floorNumber >= this.totalFloors) {
            return;
        }

        if (floorNumber === 0 && direction === Direction.DOWN) {
            return;
        }

        if (floorNumber === this.totalFloors - 1 && direction === Direction.UP) {
            return;
        }

        const request: FloorRequest = { floor: floorNumber, direction };
        this.pendingRequests.push(request);

        const floor = this.floors[floorNumber];
        if (direction === Direction.UP) {
            floor.pressUpButton();
        } else {
            floor.pressDownButton();
        }

        this.assignRequestToElevator(request);
    }

    private assignRequestToElevator(request: FloorRequest): void {
        const availableElevators = this.elevators.filter(elevator => 
            elevator.canHandleRequest(request)
        );

        if (availableElevators.length === 0) {
            return;
        }

        const bestElevator = availableElevators.reduce((best, current) => {
            const bestDistance = best.getDistanceToRequest(request);
            const currentDistance = current.getDistanceToRequest(request);
            
            if (currentDistance < bestDistance) {
                return current;
            } else if (currentDistance === bestDistance) {
                if (current.state === ElevatorState.IDLE && best.state !== ElevatorState.IDLE) {
                    return current;
                }
            }
            return best;
        });

        bestElevator.addDestination(request.floor);
        this.removePendingRequest(request);
    }

    private removePendingRequest(request: FloorRequest): void {
        const index = this.pendingRequests.findIndex(r => 
            r.floor === request.floor && r.direction === request.direction
        );
        
        if (index !== -1) {
            this.pendingRequests.splice(index, 1);
        }

        const floor = this.floors[request.floor];
        const hasOtherRequests = this.pendingRequests.some(r => 
            r.floor === request.floor && r.direction === request.direction
        );

        if (!hasOtherRequests) {
            if (request.direction === Direction.UP) {
                floor.releaseUpButton();
            } else {
                floor.releaseDownButton();
            }
        }
    }

    public requestElevatorFloor(elevatorId: number, floorNumber: number): void {
        if (floorNumber < 0 || floorNumber >= this.totalFloors) {
            return;
        }

        const elevator = this.elevators[elevatorId];
        if (elevator) {
            elevator.addDestination(floorNumber);
        }
    }

    public update(): void {
        this.elevators.forEach(elevator => {
            elevator.move();
        });

        this.pendingRequests.forEach(request => {
            this.assignRequestToElevator(request);
        });

        this.checkElevatorArrivals();
    }

    private checkElevatorArrivals(): void {
        this.elevators.forEach(elevator => {
            const floor = this.floors[elevator.currentFloor];
            
            if (floor.upButtonPressed && elevator.direction === Direction.UP) {
                floor.releaseUpButton();
                this.removePendingRequest({ floor: elevator.currentFloor, direction: Direction.UP });
            }
            
            if (floor.downButtonPressed && elevator.direction === Direction.DOWN) {
                floor.releaseDownButton();
                this.removePendingRequest({ floor: elevator.currentFloor, direction: Direction.DOWN });
            }
        });
    }

    public reset(): void {
        this.floors.forEach(floor => {
            floor.releaseUpButton();
            floor.releaseDownButton();
        });

        this.elevators.forEach(elevator => {
            elevator.currentFloor = 0;
            elevator.destinationFloors.clear();
            elevator.state = ElevatorState.IDLE;
            elevator.direction = Direction.IDLE;
        });

        this.pendingRequests = [];
    }
}