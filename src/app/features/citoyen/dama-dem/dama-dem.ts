import {
  Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';

interface MessageChat {
  role: string;
  contenu: string;
  audioUrl?: string; // audio associé au message (vocal envoyé, ou TTS Gemini généré)
  genereEnCours?: boolean;
}

// Prefixe commun a tous les historiques Dama dem : permet de tous les purger
// a la deconnexion (cf. AuthService.logout).
export const PREFIXE_HISTORIQUE = 'damaDem_historique';

@Component({
  selector: 'app-dama-dem',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dama-dem.html',
  styleUrl: './dama-dem.css'
})
export class DamaDemComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('fil') private fil?: ElementRef<HTMLDivElement>;
  private doitDefiler = false;

  messages: MessageChat[] = [];

  question = '';
  chargement = false;

  // ---- Vocal ----
  vocalSupporte = false;
  ecouteEnCours = false;
  lectureVocaleActive = true;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private synthese = window.speechSynthesis;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.vocalSupporte = !!(navigator.mediaDevices && (window as any).MediaRecorder);
  }

  ngOnInit(): void {
    this.chargerHistorique();
    this.doitDefiler = true;
  }

  ngAfterViewChecked(): void {
    if (!this.doitDefiler || !this.fil) return;
    this.doitDefiler = false;
    const el = this.fil.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // Envoie une question pré-remplie depuis les puces de suggestion
  poserSuggestion(texte: string): void {
    this.question = texte;
    this.envoyerQuestion();
  }

  // ---- Persistance de l'historique (localStorage) ----

  // Cle propre a l'utilisateur connecte : sans cela, un citoyen se connectant
  // apres un admin sur le meme navigateur reprendrait ses conversations.
  private cleHistorique(): string {
    const utilisateur = this.authService.getUsername();
    return utilisateur
      ? `${PREFIXE_HISTORIQUE}_${utilisateur}`
      : `${PREFIXE_HISTORIQUE}_anonyme`;
  }

  private chargerHistorique(): void {
    try {
      const brut = localStorage.getItem(this.cleHistorique());
      if (brut) {
        this.messages = JSON.parse(brut);
        return;
      }
    } catch (e) {
      console.error('Erreur lecture historique Dama dem :', e);
    }

    // Aucun historique : message d'accueil par défaut
    this.messages = [
      {
        role: 'assistant',
        contenu: 'Bonjour ! Je suis Dama dem, votre assistant transport à Dakar. Comment puis-je vous aider ? 🚌'
      }
    ];
  }

  private sauvegarderHistorique(): void {
    try {
      localStorage.setItem(this.cleHistorique(), JSON.stringify(this.messages));
    } catch (e) {
      // Peut échouer si le quota localStorage est dépassé (trop d'audios stockés)
      console.error('Erreur sauvegarde historique Dama dem :', e);
    }
  }

  effacerHistorique(): void {
    this.messages = [
      {
        role: 'assistant',
        contenu: 'Historique effacé. Comment puis-je vous aider ? 🚌'
      }
    ];
    localStorage.removeItem(this.cleHistorique());
  }

  // ---- Réécoute d'un vocal déjà envoyé ----

  lireAudioEnvoye(audioUrl: string): void {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Lecture audio impossible :', err));
  }

  // ---- Enregistrement vocal ----

  async basculerEcoute(): Promise<void> {
    if (!this.vocalSupporte || this.chargement) return;

    if (this.ecouteEnCours) {
      this.arreterEnregistrement();
      return;
    }

    try {
      this.synthese.cancel();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
        this.envoyerVocal(audioBlob);
      };

      this.mediaRecorder.start();
      this.ecouteEnCours = true;
    } catch (err) {
      console.error('Micro inaccessible :', err);
      this.ecouteEnCours = false;
    }
  }

  private arreterEnregistrement(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.ecouteEnCours = false;
  }

  private blobEnBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async envoyerVocal(audioBlob: Blob): Promise<void> {
    this.chargement = true;

    // On garde une copie locale (base64) de l'audio pour pouvoir le réécouter plus tard
    const audioUrl = await this.blobEnBase64(audioBlob);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'question.webm');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    this.http.post<any>(
      '/api/v1/transport/assistant/demander-vocal',
      formData,
      { headers }
    ).subscribe({
      next: (data) => {
        const transcription = data.transcription || '(question vocale)';
        const reponse = data.reponse || 'Je n\'ai pas pu répondre.';

        this.messages.push({
          role: 'user',
          contenu: '🎙️ ' + transcription,
          audioUrl: audioUrl
        });
        this.messages.push({ role: 'assistant', contenu: reponse });
        this.chargement = false;
        this.sauvegarderHistorique();
        this.doitDefiler = true;
        this.lireAVoixHaute(reponse);
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          contenu: '❌ Désolé, je n\'ai pas pu traiter votre message vocal.'
        });
        this.chargement = false;
        this.sauvegarderHistorique();
        this.doitDefiler = true;
      }
    });
  }

  basculerLectureVocale(): void {
    this.lectureVocaleActive = !this.lectureVocaleActive;
    if (!this.lectureVocaleActive) {
      this.synthese.cancel();
    }
  }

  // Réécoute d'une réponse de Dama dem — génère une vraie voix via Gemini
  // TTS (gère le wolof) au premier clic, puis rejoue l'audio mis en cache
  // sur les clics suivants (pas de nouvel appel API à chaque fois).
  rejouerMessage(msg: MessageChat): void {
      if (msg.genereEnCours) return;

      if (msg.audioUrl) {
        this.lireAudioEnvoye(msg.audioUrl);
        return;
      }

      msg.genereEnCours = true;

      this.http.post<any>(
        '/api/v1/transport/assistant/tts',
        { texte: msg.contenu },
        { headers: this.getHeaders() }
      ).subscribe({
        next: (data) => {
          msg.genereEnCours = false;
          const url: string | undefined = data.audioUrl;
          if (url) {
            msg.audioUrl = url;
            this.sauvegarderHistorique();
        this.doitDefiler = true;
            this.lireAudioEnvoye(url);
          }
        },
        error: () => {
          msg.genereEnCours = false;
          // Gemini injoignable (reseau lent, quota, coupure) : plutot que de
          // laisser l'utilisateur sans son, on lit la reponse avec la voix du
          // navigateur. Moins naturelle, mais toujours disponible.
          console.warn('Voix Gemini indisponible — repli sur la voix du navigateur.');
          this.lireAVoixHauteForce(msg.contenu);
        }
      });
    }

  // Repli quand Gemini echoue : l'utilisateur a clique sur ▶️, on lit donc
  // meme si la lecture automatique est desactivee.
  private lireAVoixHauteForce(texte: string): void {
    if (!this.synthese) return;
    this.parlerNavigateur(texte);
  }

  private lireAVoixHaute(texte: string): void {
    if (!this.lectureVocaleActive || !this.synthese) return;
    this.parlerNavigateur(texte);
  }

  private parlerNavigateur(texte: string): void {
    const texteNettoye = texte.replace(/[🚌🗺💰❌✅🟢🔴🎙️]/gu, '').trim();
    if (!texteNettoye) return;

    this.synthese.cancel();
    const utterance = new SpeechSynthesisUtterance(texteNettoye);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    this.synthese.speak(utterance);
  }

  ngOnDestroy(): void {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.synthese?.cancel();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  envoyerQuestion(): void {
    if (!this.question.trim() || this.chargement) return;

    const q = this.question.trim();
    this.messages.push({ role: 'user', contenu: q });
    this.question = '';
    this.chargement = true;
    this.sauvegarderHistorique();
        this.doitDefiler = true;

    this.http.post<any>(
      '/api/v1/transport/assistant/demander',
      { question: q },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (data) => {
        const reponse = data.reponse || 'Je n\'ai pas pu répondre.';
        this.messages.push({ role: 'assistant', contenu: reponse });
        this.chargement = false;
        this.sauvegarderHistorique();
        this.doitDefiler = true;
        this.lireAVoixHaute(reponse);
      },
      error: () => {
        const reponse = '❌ Désolé, je rencontre une difficulté. Réessayez.';
        this.messages.push({ role: 'assistant', contenu: reponse });
        this.chargement = false;
        this.sauvegarderHistorique();
        this.doitDefiler = true;
        this.lireAVoixHaute(reponse);
      }
    });
  }
}