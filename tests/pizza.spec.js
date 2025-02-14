import { test, expect } from 'playwright-test-coverage';

// Mock data for reuse
const mockMenu = [
  { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
  { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' }
];

const mockFranchises = [
  {
    id: 2,
    name: 'LotaPizza',
    stores: [
      { id: 4, name: 'Lehi' },
      { id: 5, name: 'Springville' },
      { id: 6, name: 'American Fork' }
    ]
  },
  { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
  { id: 4, name: 'topSpot', stores: [] }
];

// Test 1: Customer orders pizzas
test('customer completes full order process', async ({ page }) => {
  await page.route('*/**/api/order/menu', async route => {
    await route.fulfill({ json: mockMenu });
  });

  await page.route('*/**/api/franchise', async route => {
    await route.fulfill({ json: mockFranchises });
  });

  await page.route('*/**/api/auth', async route => {
    await route.fulfill({ 
      json: { 
        user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, 
        token: 'abcdef' 
      } 
    });
  });

  await page.route('*/**/api/order', async route => {
    await route.fulfill({ 
      json: { 
        order: {
          items: mockMenu.map(item => ({ menuId: item.id, description: item.title, price: item.price })),
          storeId: '4',
          franchiseId: 2,
          id: 23
        },
        jwt: 'eyJpYXQ'
      } 
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('0.008')).toBeVisible();
});

// Test 2: Admin login and dashboard access
test('admin successfully logs in and accesses dashboard', async ({ page }) => {
  await page.route('*/**/api/auth', async route => {
    await route.fulfill({ 
      json: { 
        user: { id: 3, name: '常', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, 
        token: 'abcdef' 
      } 
    });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.locator('#navbar-dark')).toContainText('Admin');
  await expect(page.getByRole('link', { name: '常' })).toBeVisible();
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading')).toContainText('Mama Ricci\'s kitchen');
  await expect(page.getByRole('link', { name: 'admin-dashboard' })).toBeVisible();
});

// Test 3: Regular user dashboard
test('regular user accesses dashboard and franchise info', async ({ page }) => {
  await page.route('*/**/api/auth', async route => {
    await route.fulfill({ 
      json: { 
        user: { id: 3, name: 'test', email: 't@jwt.com', roles: [{ role: 'diner' }] }, 
        token: 'abcdef' 
      } 
    });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('test');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.locator('#navbar-dark')).toContainText('Franchise');
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
  await expect(page.getByRole('main')).toContainText('Call now800-555-5555');

  await page.getByRole('link', { name: 't', exact: true }).click();
  await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
  await expect(page.getByRole('link', { name: 'diner-dashboard' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('test');
  await expect(page.getByRole('main')).toContainText('t@jwt.com');
  await expect(page.getByRole('main')).toContainText('diner');
});

// Test 4: About page content
test('about page displays correct content', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('main')).toContainText('The secret sauce');
  await expect(page.getByRole('main')).toContainText('Our employees');
  await expect(page.getByRole('main').getByRole('img').first()).toBeVisible();
  await expect(page.getByRole('list')).toContainText('about');
});

// Test 5: History page content
test('history page displays correct content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toContainText('History');
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
  await expect(page.getByRole('main').getByRole('img')).toBeVisible();
});

// Test 6: Documentation page
test('documentation page loads correctly', async ({ page }) => {
  await page.goto('/docs');
  await expect(page.getByRole('main')).toContainText('JWT Pizza API');
});

// Test 7: User registration and logout
test('user registration and logout process', async ({ page }) => {
  await page.route('*/**/api/auth', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ 
        json: { 
          user: { id: 3, name: 'admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, 
          token: 'abcdef' 
        } 
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('admin');
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Register' }).click();
  
  await expect(page.getByText('The web\'s best pizza', { exact: true })).toBeVisible();
  await expect(page.locator('#navbar-dark')).toContainText('Logout');
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.locator('#navbar-dark')).toContainText('Login');
});

// Test 8: 404 Not Found page
test('not found page displays correctly', async ({ page }) => {
  await page.goto('/notfound');
  await expect(page.getByRole('list')).toContainText('notfound');
  await expect(page.getByText('Oops')).toBeVisible();
});

// Test 9: Create new franchise
test('admin creates new franchise', async ({ page }) => {
  await page.route('*/**/api/auth', async route => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ 
        json: { 
          user: { id: 3, name: 'admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, 
          token: 'abcdef' 
        } 
      });
    }
  });

  await page.route('*/**/api/franchise', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ 
        json: { 
          name: 'test franchise',
          admins: [{ email: 'f@jwt.com', id: 3, name: 'franchisee' }],
          id: 2
        } 
      });
    }
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('test franchise');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
});

test.describe('Close Franchise Tests', () => {
    test('displays close franchise confirmation and handles closure', async ({ page }) => {
      // Mock the franchise data
      const mockFranchise = {
        id: 1,
        name: 'Test Franchise',
        stores: [
          { id: 1, name: 'Store 1' },
          { id: 2, name: 'Store 2' }
        ]
      };
  
      // Setup auth for admin access
      await page.route('*/**/api/auth', async route => {
        await route.fulfill({ 
          json: { 
            user: { 
              id: 1, 
              name: 'Admin', 
              email: 'admin@test.com', 
              roles: [{ role: 'admin' }] 
            }, 
            token: 'test-token' 
          } 
        });
      });
  
      // Mock franchise deletion endpoint
      await page.route('*/**/api/franchise/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ json: { success: true } });
        }
      });
  
      // Mock franchises list endpoint
      await page.route('*/**/api/franchise', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: [mockFranchise] });
        }
      });
  
      // Navigate to admin dashboard first
      await page.goto('/');
      await page.getByRole('link', { name: 'Login' }).click();
      await page.getByRole('textbox', { name: 'Email address' }).fill('admin@test.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('admin');
      await page.getByRole('button', { name: 'Login' }).click();
  
      // Go to admin page and click delete franchise
      await page.getByRole('link', { name: 'Admin' }).click();
      await page.getByRole('row', { name: 'Test Franchise' }).getByRole('button').click();
  
      // Verify close franchise page content
      await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
      await expect(page.getByText('Are you sure you want to close the')).toBeVisible();
      await expect(page.getByText('Test Franchise')).toBeVisible();
      await expect(page.getByText('franchise? This will close all associated stores and cannot be restored.')).toBeVisible();
  
      // Verify buttons exist
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  
      // Test cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading')).toContainText("Mama Ricci's kitchen");
  
      // Go back to close franchise page
      await page.getByRole('row', { name: 'Test Franchise' }).getByRole('button').click();
  
      // Test close button
      await page.getByRole('button', { name: 'Close' }).click();
      
      // Verify redirect after closing
      await expect(page.getByRole('heading')).toContainText("Mama Ricci's kitchen");
    });
  
  
    test('displays error message when franchise closure fails', async ({ page }) => {
      // Mock the franchise data
      const mockFranchise = {
        id: 1,
        name: 'Test Franchise',
        stores: [
          { id: 1, name: 'Store 1' },
          { id: 2, name: 'Store 2' }
        ]
      };
  
      // Setup auth
      await page.route('*/**/api/auth', async route => {
        await route.fulfill({ 
          json: { 
            user: { 
              id: 1, 
              name: 'Admin', 
              email: 'admin@test.com', 
              roles: [{ role: 'admin' }] 
            }, 
            token: 'test-token' 
          } 
        });
      });
  
      // Mock franchise endpoints with error
      await page.route('*/**/api/franchise/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ 
            status: 500,
            json: { message: 'Failed to close franchise' }
          });
        }
      });
  
      // Mock franchises list
      await page.route('*/**/api/franchise', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: [mockFranchise] });
        }
      });
  
      // Navigate through admin flow
      await page.goto('/');
      await page.getByRole('link', { name: 'Login' }).click();
      await page.getByRole('textbox', { name: 'Email address' }).fill('admin@test.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('admin');
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByRole('link', { name: 'Admin' }).click();
      await page.getByRole('row', { name: 'Test Franchise' }).getByRole('button').click();
  
      // Try to close franchise
      await page.getByRole('button', { name: 'Close' }).click();
      
      // Should show error message and stay on same page
      await expect(page.getByText('Sorry to see you go')).toBeVisible();
      await expect(page.getByText('Test Franchise')).toBeVisible();
    });
  });


