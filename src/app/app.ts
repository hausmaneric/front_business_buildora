import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('obrax-administracao');
  showRouterOutlet = true;

  constructor(private router: Router) {
    setTimeout(() => {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.showRouterOutlet = event.url === '/login' || event.url === '/main' || event.url.startsWith('/main/');
        }
      });
    }, 0);
  }
}
