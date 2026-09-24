import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = '/api/v1/auth';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
      return this.http.post(`${this.apiUrl}/login`,
        { username, password }
      ).pipe(
        tap((response: any) => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('role', response.role);
          localStorage.setItem('username', username);
        })
      );
    }
	
	// L'inscription publique crée toujours un compte citoyen : le rôle est
	// décidé par le serveur, jamais envoyé par le client.
	register(username: string, password: string): Observable<any> {
	    return this.http.post(`${this.apiUrl}/register`,
	      { username, password }
	    ).pipe(
	      tap((response: any) => {
	        localStorage.setItem('token', response.token);
	        localStorage.setItem('role', response.role);
	        localStorage.setItem('username', username);
	      })
	    );
	  }
	  
	  // effacerDonnees : supprime aussi les historiques Dama dem de ce navigateur.
	  // Par defaut l'historique est conserve (l'utilisateur le retrouve a la
	  // reconnexion) ; il est isolé par nom d'utilisateur, donc invisible pour un
	  // autre compte. Utile sur un poste partage : cf. bouton "Se deconnecter et
	  // effacer" dans la navbar.
	  logout(effacerDonnees: boolean = false): void {
	      localStorage.removeItem('token');
	      localStorage.removeItem('role');
	      localStorage.removeItem('username');
	      if (effacerDonnees) {
	        this.purgerHistoriquesDamaDem();
	      }
	    }

	  // Purge par prefixe pour recuperer aussi les historiques d'anciennes
	  // sessions (y compris l'ancienne cle sans suffixe utilisateur).
	  private purgerHistoriquesDamaDem(): void {
	      const aSupprimer: string[] = [];
	      for (let i = 0; i < localStorage.length; i++) {
	        const cle = localStorage.key(i);
	        if (cle && cle.startsWith('damaDem_historique')) {
	          aSupprimer.push(cle);
	        }
	      }
	      aSupprimer.forEach(cle => localStorage.removeItem(cle));
	    }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }
  getUsername(): string | null {
      return localStorage.getItem('username');
    }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isClient(): boolean {
    return this.getRole() === 'CLIENT';
  }
}