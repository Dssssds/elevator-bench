import { Direction } from './Elevator';

export class Floor {
    public number: number;
    public upButtonPressed: boolean = false;
    public downButtonPressed: boolean = false;
    public element: HTMLElement | null = null;
    public upButton: HTMLElement | null = null;
    public downButton: HTMLElement | null = null;

    constructor(number: number) {
        this.number = number;
    }

    public pressUpButton(): void {
        if (this.number !== 9) {
            this.upButtonPressed = true;
            this.updateButtonVisuals();
        }
    }

    public pressDownButton(): void {
        if (this.number !== 0) {
            this.downButtonPressed = true;
            this.updateButtonVisuals();
        }
    }

    public releaseUpButton(): void {
        this.upButtonPressed = false;
        this.updateButtonVisuals();
    }

    public releaseDownButton(): void {
        this.downButtonPressed = false;
        this.updateButtonVisuals();
    }

    public hasActiveRequest(): boolean {
        return this.upButtonPressed || this.downButtonPressed;
    }

    public getActiveRequests(): Direction[] {
        const requests: Direction[] = [];
        if (this.upButtonPressed) requests.push(Direction.UP);
        if (this.downButtonPressed) requests.push(Direction.DOWN);
        return requests;
    }

    private updateButtonVisuals(): void {
        if (this.upButton) {
            if (this.upButtonPressed) {
                this.upButton.classList.add('active');
            } else {
                this.upButton.classList.remove('active');
            }
        }

        if (this.downButton) {
            if (this.downButtonPressed) {
                this.downButton.classList.add('active');
            } else {
                this.downButton.classList.remove('active');
            }
        }
    }
}