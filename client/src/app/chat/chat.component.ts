import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage, ChatService } from './chat.service';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements AfterViewChecked {
  private chatService = inject(ChatService);

  @ViewChild('messagesEl') private messagesEl?: ElementRef<HTMLElement>;

  open = false;
  input = '';
  messages: ChatMessage[] = [
    { role: 'assistant', content: 'Hi! Ask me about our products, shipping, returns or opening hours.' },
  ];
  // Only real exchanges are sent to the server (not the greeting).
  private history: ChatMessage[] = [];

  ngAfterViewChecked() {
    const el = this.messagesEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async send() {
    const message = this.input.trim();
    if (!message) return;
    this.input = '';
    this.messages.push({ role: 'user', content: message });
    const pending: ChatMessage = { role: 'assistant', content: '…' };
    this.messages.push(pending);
    try {
      const reply = await this.chatService.send(message, this.history);
      pending.content = reply;
      this.history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
    } catch {
      pending.content = "Sorry, I couldn't reach the server.";
    }
  }
}
