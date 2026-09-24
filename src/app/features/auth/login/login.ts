import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ThemeService } from '../../../core/services/theme';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  get themeClair(): boolean {
    return this.themeService.theme() === 'clair';
  }

  basculerTheme(): void {
    this.themeService.basculer();
  }

  username = '';
  password = '';
  erreur = '';
  chargement = false;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private router: Router
  ) {}

  seConnecter(): void {
    if (!this.username || !this.password) {
      this.erreur = 'Veuillez remplir tous les champs';
      return;
    }

    this.chargement = true;
    this.erreur = '';

    this.authService.login(this.username, this.password)
      .subscribe({
        next: () => {
          this.chargement = false;
          const destination = this.authService.isAdmin() ? '/admin' : '/citoyen';
          this.router.navigate([destination]);
        },
        error: () => {
          this.chargement = false;
          this.erreur = 'Identifiants incorrects';
        }
      });
  }
}