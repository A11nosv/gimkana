import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  projectId: "gimkana-b1d8b",
  appId: "1:687067546645:web:de07b21be6ae4e3f5bba1c",
  storageBucket: "gimkana-b1d8b.firebasestorage.app",
  apiKey: "AIzaSyCJPHypeDlGemu9QXrh13GgF8L5cEU43uU",
  authDomain: "gimkana-b1d8b.firebaseapp.com",
  messagingSenderId: "687067546645",
  measurementId: "G-3R2EDQP8ZF"
};

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
  ],
});
