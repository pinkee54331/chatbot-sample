import { Component } from '@angular/core';
import { ChatComponent } from './chat/chat.component';

@Component({
  selector: 'app-root',
  imports: [ChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  products = [
    { name: 'House Blend', description: 'Chocolate and caramel notes.', price: 14 },
    { name: 'Sunrise Espresso', description: 'Bold and smoky.', price: 16 },
    { name: 'Ethiopia Yirgacheffe', description: 'Floral and citrus.', price: 19 },
  ];
}
