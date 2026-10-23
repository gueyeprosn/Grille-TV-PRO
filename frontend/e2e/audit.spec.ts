import { test, expect } from '@playwright/test';

test.describe('GrilleTV Pro - UI/UX & Functional Audit', () => {
  test('1. Nouvelle page de connexion (Login Dark Glassmorphism)', async ({ page }) => {
    // Ouvrir sans session pour voir la nouvelle page de connexion
    await page.goto('/grille/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('/grille/');
    await page.waitForTimeout(1000);

    // Vérifier la présence du nouveau titre et des champs
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();

    // Capturer le screenshot de la nouvelle page de connexion
    await page.screenshot({ path: 'e2e-screenshots/01-login-screen.png' });

    // Tester la connexion via le formulaire
    await page.fill('#login-email', 'admin@grilletv.local');
    await page.fill('#login-password', 'admin123');
    await page.click('button[type="submit"]');

    // Attendre le rechargement et l'arrivée sur l'application
    await page.waitForTimeout(2000);
  });

  test('2. Dashboard Principal & Grille (Desktop)', async ({ page }) => {
    await page.goto('/grille/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdyaWxsZXR2LmxvY2FsIiwidWlkIjoiYWRtaW5AZ3JpbGxldHYubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3OTIwNDIwNTgsImV4cCI6MTc5MjY0Njg1OH0.-waZjQmvM8tFRm3lSesllHotHd5ydsLFVGpy74kvFnc');
      localStorage.setItem('localUser', JSON.stringify({
        email: 'admin@grilletv.local',
        displayName: 'Administrateur',
        role: 'ADMIN',
        uid: 'admin@grilletv.local'
      }));
    });
    await page.goto('/grille/');
    await page.waitForTimeout(1000);

    // Vérifier que le header est propre et sans doublon
    await page.screenshot({ path: 'e2e-screenshots/02-dashboard-screen.png' });

    // Survoler le programme en cours pour vérifier la barre d'action
    const programCard = page.locator('.week-agenda-container [title*="Matinale"]').first();
    if (await programCard.isVisible()) {
      await programCard.hover();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e-screenshots/02b-card-hover.png' });
    }

    // Scroller vers le bas dans la grille semaine
    const gridScroll = page.locator('.week-agenda-container.overflow-auto');
    if (await gridScroll.isVisible()) {
      await gridScroll.evaluate(el => el.scrollTop = 450);
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'e2e-screenshots/02c-grid-scrolled.png' });
    }
  });

  test('3. Vue Régie ON AIR (Haute lisibilité)', async ({ page }) => {
    await page.goto('/grille/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdyaWxsZXR2LmxvY2FsIiwidWlkIjoiYWRtaW5AZ3JpbGxldHYubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3OTIwNDIwNTgsImV4cCI6MTc5MjY0Njg1OH0.-waZjQmvM8tFRm3lSesllHotHd5ydsLFVGpy74kvFnc');
      localStorage.setItem('localUser', JSON.stringify({
        email: 'admin@grilletv.local',
        displayName: 'Administrateur',
        role: 'ADMIN',
        uid: 'admin@grilletv.local'
      }));
    });
    await page.goto('/grille/');
    await page.waitForTimeout(1000);

    const regieBtn = page.getByRole('button', { name: /Régie ON AIR/i });
    if (await regieBtn.isVisible()) {
      await regieBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e-screenshots/03-regie-on-air.png' });
    }
  });

  test('4. Vue Mobile & Contrastes (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/grille/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdyaWxsZXR2LmxvY2FsIiwidWlkIjoiYWRtaW5AZ3JpbGxldHYubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3OTIwNDIwNTgsImV4cCI6MTc5MjY0Njg1OH0.-waZjQmvM8tFRm3lSesllHotHd5ydsLFVGpy74kvFnc');
      localStorage.setItem('localUser', JSON.stringify({
        email: 'admin@grilletv.local',
        displayName: 'Administrateur',
        role: 'ADMIN',
        uid: 'admin@grilletv.local'
      }));
    });
    await page.goto('/grille/');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'e2e-screenshots/04-mobile-screen.png' });
  });
});
