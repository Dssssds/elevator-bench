export enum Direction {
    UP = 'up',
    DOWN = 'down',
    IDLE = 'idle'
}

export enum ElevatorState {
    IDLE = 'idle',
    MOVING_UP = 'moving-up',
    MOVING_DOWN = 'moving-down'
}

export interface FloorRequest {
    floor: number;
    direction: Direction;
}

export class Elevator {
    public id: number;
    public currentFloor: number;
    public destinationFloors: Set<number>;
    public state: ElevatorState;
    public direction: Direction;
    public element: HTMLElement | null = null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.destinationFloors = new Set();
        this.state = ElevatorState.IDLE;
        this.direction = Direction.IDLE;
    }

    public addDestination(floor: number): void {
        this.destinationFloors.add(floor);
        this.updateDirection();
    }

    public removeDestination(floor: number): void {
        this.destinationFloors.delete(floor);
        this.updateDirection();
    }

    public hasDestination(floor: number): boolean {
        return this.destinationFloors.has(floor);
    }

    public getNextDestination(): number | null {
        if (this.destinationFloors.size === 0) {
            return null;
        }

        if (this.direction === Direction.UP) {
            const destinations = Array.from(this.destinationFloors).filter(f => f > this.currentFloor);
            if (destinations.length > 0) {
                return Math.min(...destinations);
            }
        } else if (this.direction === Direction.DOWN) {
            const destinations = Array.from(this.destinationFloors).filter(f => f < this.currentFloor);
            if (destinations.length > 0) {
                return Math.max(...destinations);
            }
        }

        return Array.from(this.destinationFloors)[0];
    }

    public updateDirection(): void {
        if (this.destinationFloors.size === 0) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.IDLE;
            return;
        }

        const nextDestination = this.getNextDestination();
        if (nextDestination === null) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.IDLE;
            return;
        }

        if (nextDestination > this.currentFloor) {
            this.state = ElevatorState.MOVING_UP;
            this.direction = Direction.UP;
        } else if (nextDestination < this.currentFloor) {
            this.state = ElevatorState.MOVING_DOWN;
            this.direction = Direction.DOWN;
        } else {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.IDLE;
        }
    }

    public move(): boolean {
        const nextDestination = this.getNextDestination();
        if (nextDestination === null) {
            return false;
        }

        if (nextDestination > this.currentFloor) {
            this.currentFloor++;
        } else if (nextDestination < this.currentFloor) {
            this.currentFloor--;
        }

        if (this.currentFloor === nextDestination) {
            this.removeDestination(this.currentFloor);
        }

        this.updateDirection();
        return true;
    }

    public canHandleRequest(request: FloorRequest): boolean {
        if (this.state === ElevatorState.IDLE) {
            return true;
        }

        if (this.direction === Direction.UP && request.direction === Direction.UP && request.floor >= this.currentFloor) {
            return true;
        }

        if (this.direction === Direction.DOWN && request.direction === Direction.DOWN && request.floor <= this.currentFloor) {
            return true;
        }

        return false;
    }

    public getDistanceToRequest(request: FloorRequest): number {
        return Math.abs(this.currentFloor - request.floor);
    }
}