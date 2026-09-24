import { Injectable, signal } from '@angular/core';

export type Theme = 'clair' | 'sombre';

const CLE_THEME = 'rmg_theme';

/**
 * Gère le thème visuel de l'application.
 *
 * Le thème est appliqué en posant `data-theme` sur <html> : toutes les
 * couleurs du design system étant des variables CSS redéfinies par thème,
 * la bascule est instantanée et ne demande aucun rechargement.
 *
 * Ordre de priorité : choix explicite déjà enregistré, sinon préférence
 * du système d'exploitation, sinon le thème sombre du produit.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {

  /** Thème courant, exposé en signal pour que les composants s'y abonnent. */
  readonly theme = signal<Theme>('sombre');

  constructor() {
    this.appliquer(this.themeInitial(), false);
    this.suivrePreferenceSysteme();
  }

  private themeInitial(): Theme {
    const enregistre = localStorage.getItem(CLE_THEME);
    if (enregistre === 'clair' || enregistre === 'sombre') {
      return enregistre;
    }
    // Aucun choix explicite : on suit la préférence du système.
    return window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'clair'
      : 'sombre';
  }

  /**
   * Tant que l'utilisateur n'a pas fait de choix explicite, l'application
   * suit les changements de thème du système (mode nuit automatique, etc.).
   */
  private suivrePreferenceSysteme(): void {
    const requete = window.matchMedia?.('(prefers-color-scheme: light)');
    requete?.addEventListener?.('change', (e) => {
      if (localStorage.getItem(CLE_THEME)) return;
      this.appliquer(e.matches ? 'clair' : 'sombre', false);
    });
  }

  basculer(): void {
    this.appliquer(this.theme() === 'sombre' ? 'clair' : 'sombre', true);
  }

  definir(theme: Theme): void {
    this.appliquer(theme, true);
  }

  private appliquer(theme: Theme, memoriser: boolean): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Accorde la barre d'adresse du navigateur mobile au thème.
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'clair' ? '#ffffff' : '#0a1628');

    if (memoriser) {
      localStorage.setItem(CLE_THEME, theme);
    }
  }
}
