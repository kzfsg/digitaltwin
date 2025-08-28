interface PopupElements {
  actionButton: HTMLButtonElement;
  status: HTMLDivElement;
}

class PopupUI {
  private elements: PopupElements;

  constructor() {
    this.elements = {
      actionButton: document.getElementById('actionButton') as HTMLButtonElement,
      status: document.getElementById('status') as HTMLDivElement
    };
    
    this.init();
  }

  private init(): void {
    this.elements.actionButton.addEventListener('click', () => {
      this.handleAction();
    });
  }

  private handleAction(): void {
    this.setStatus('Action clicked');
  }

  private setStatus(message: string): void {
    this.elements.status.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});