import { test, expect } from '@playwright/test';

test('Sales role can view pipeline report', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem(
      'session',
      JSON.stringify({ accessToken: 'fake-token', tokenType: 'Bearer', userId: 1, username: 'sales', fullName: 'Sales User', roles: ['VT-04'] })
    );
  });

  // Mock backend response so test doesn't depend on running backend
  await page.route('**/api/v1/opportunities/pipeline-report', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalOpportunityCount: 12,
          totalExpectedValue: 3150000000,
          stalledThresholdDays: 60,
          generatedAt: new Date().toISOString(),
          stages: [
            { stage: 'APPROACH', opportunityCount: 4, totalExpectedValue: 700000000, averageDaysInStage: 18, stalledCount: 0, stalledOpportunityIds: [] },
            { stage: 'PROPOSAL', opportunityCount: 3, totalExpectedValue: 900000000, averageDaysInStage: 25, stalledCount: 0, stalledOpportunityIds: [] },
            { stage: 'NEGOTIATION', opportunityCount: 2, totalExpectedValue: 800000000, averageDaysInStage: 47, stalledCount: 1, stalledOpportunityIds: [2007] },
            { stage: 'WON', opportunityCount: 2, totalExpectedValue: 600000000, averageDaysInStage: 5, stalledCount: 0, stalledOpportunityIds: [] },
            { stage: 'LOST', opportunityCount: 1, totalExpectedValue: 150000000, averageDaysInStage: 3, stalledCount: 0, stalledOpportunityIds: [] }
          ]
        }
      })
    });
  });

  await page.goto('http://localhost:5173/');
  await page.click('text=Báo cáo');
  await page.click('text=Báo cáo đường ống bán hàng theo giai đoạn');

  await expect(page.getByText('Báo cáo đường ống bán hàng theo giai đoạn')).toBeVisible();
  await expect(page.getByText('Tổng cơ hội')).toBeVisible();
});
