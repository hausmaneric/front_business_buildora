import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app/app.routes';
import { RouteReuse } from './app/app.route.reuse';

// 🔹 Syncfusion
import { registerLicense, enableRipple } from '@syncfusion/ej2-base';

registerLicense('Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdlWX1ccHVXRGZdWUxxVkdWYEs=');
enableRipple(true);

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideAnimations(),
    provideRouter(routes),
  
    { provide: RouteReuseStrategy, useClass: RouteReuse }
  ]
});