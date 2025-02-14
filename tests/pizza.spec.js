import { create } from 'domain';
import { test, expect } from 'playwright-test-coverage';

test('purchase with login', async ({ page }) => {
    await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
    });

    await page.route('*/**/api/franchise', async (route) => {
    const franchiseRes = [
        {
        id: 2,
        name: 'LotaPizza',
        stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
        ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
        { id: 4, name: 'topSpot', stores: [] },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
    });

    await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
    });

    await page.route('*/**/api/order', async (route) => {
        if (route.request().method() == 'POST') {
    const orderReq = {
        items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
        ],
        storeId: '4',
        franchiseId: 2,
    };
    const orderRes = {
        order: {
        items: [
            { menuId: 1, description: 'Veggie', price: 0.0038 },
            { menuId: 2, description: 'Pepperoni', price: 0.0042 },
        ],
        storeId: '4',
        franchiseId: 2,
        id: 23,
        },
        jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
    }
    else if (route.request().method() == 'GET') {
        const orderRes = [
            {
            items: [
                { menuId: 1, description: 'Veggie', price: 0.0038 },
                { menuId: 2, description: 'Pepperoni', price: 0.0042 },
            ],
            storeId: '4',
            franchiseId: 2,
            id: 23,
            },
        ];
        expect(route.request().method()).toBe('GET');
        await route.fulfill({ json: orderRes });
    }
    });

    //Get orders mock  
    await page.goto('/');

    // Go to order page
    await page.getByRole('button', { name: 'Order now' }).click();

    // Create order
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    await page.getByRole('combobox').selectOption('4');
    await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
    await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
    await expect(page.locator('form')).toContainText('Selected pizzas: 2');
    await page.getByRole('button', { name: 'Checkout' }).click();

    // Login
    await page.getByPlaceholder('Email address').click();
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Email address').press('Tab');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Login' }).click();

    // Pay
    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();

    // Check balance
    await expect(page.getByText('0.008')).toBeVisible();

    // Check orders


});

test('go to about and assert text', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.getByRole('main')).toContainText('The secret sauce');
    await expect(page.getByRole('main')).toContainText('Our employees');
    await expect(page.getByRole('main').getByRole('img').first()).toBeVisible();
    await expect(page.getByRole('list')).toContainText('about');
});

test('go to history and assert text', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page.getByRole('contentinfo')).toContainText('History');
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
    await expect(page.getByRole('main').getByRole('img')).toBeVisible();
});


test('admin page', async ({ page }) => {
    await page.route('*/**/api/auth', async (route) => {
        const loginReq = { email: 'a@jwt.com', password: 'admin' };
        const loginRes = { user: { id: 3, name: '常', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdef' };
        expect(route.request().method()).toBe('PUT');
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

        //login as admin
        await page.goto('/');
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Email address' }).click();
        await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
        await page.getByRole('textbox', { name: 'Password' }).click();
        await page.getByRole('textbox', { name: 'Password' }).fill('admin');
        await page.getByRole('button', { name: 'Login' }).click();

        //assert admin page
        await expect(page.locator('#navbar-dark')).toContainText('Admin');
        await expect(page.getByRole('link', { name: '常' })).toBeVisible();
        await page.getByRole('link', { name: 'Admin' }).click();
        await expect(page.getByRole('heading')).toContainText('Mama Ricci\'s kitchen');
        await expect(page.getByRole('link', { name: 'admin-dashboard' })).toBeVisible();
});

test('store ', async ({ page }) => {
    await page.route('*/**/api/auth', async (route) => {
        const loginReq = { email: 't@jwt.com', password: 'test' };
        const loginRes = { user: { id: 3, name: 'test', email: 't@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
        expect(route.request().method()).toBe('PUT');
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

        await page.goto('/');
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Email address' }).click();
        await page.getByRole('textbox', { name: 'Email address' }).fill('t@jwt.com');
        await page.getByRole('textbox', { name: 'Password' }).click();
        await page.getByRole('textbox', { name: 'Password' }).fill('test');
        await page.getByRole('button', { name: 'Login' }).click();



      // franchise page as non franchisee

        await expect(page.locator('#navbar-dark')).toContainText('Franchise');
        await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
        await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
        await expect(page.getByText('If you are already a')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Call now800-555-5555');
    
    // diner dashboard assert

    await page.getByRole('link', { name: 't', exact: true }).click();
    await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
    await expect(page.getByRole('link', { name: 'diner-dashboard' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('test');
    await expect(page.getByRole('main')).toContainText('t@jwt.com');
    await expect(page.getByRole('main')).toContainText('diner');
    await expect(page.getByRole('link', { name: 't', exact: true })).toBeVisible();

    

});

test('docs page ', async ({ page }) => {
    await page.goto('http://localhost:5173/docs');
    await expect(page.getByRole('main')).toContainText('JWT Pizza API');
});


test('register admin,franchisee,login admin create and delete franchise ', async ({ page }) => {
    await page.route('*/**/api/auth', async (route) => {
        if (route.request().method() == 'POST') {
        const loginReq = { email: 'a@jwt.com', password: 'admin' };
        const loginRes = { user: { id: 3, name: 'admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdef' };
        expect(route.request().method()).toBe('POST');
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
        }
        else if (route.request().method() == 'DELETE') {
            const logoutRes = { message: 'logout successful' };
            expect(route.request().method()).toBe('DELETE');
            await route.fulfill({ json: logoutRes });
        }
    });
    

    await page.goto('/');
    await expect(page.locator('#navbar-dark')).toContainText('Register');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('admin');
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('The web\'s best pizza', { exact: true })).toBeVisible();

    // await page.getByRole('link', { name: 'Admin' }).click();
    // await page.getByRole('button', { name: 'Add Franchise' }).click();
    // await page.getByRole('textbox', { name: 'franchise name' }).click();
    // await page.getByRole('textbox', { name: 'franchise name' }).fill('testFranchise');
    // await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
    // await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('a@jwt.com');
    // await expect(page.getByRole('heading')).toContainText('Create franchise');
    // await page.getByRole('button', { name: 'Create' }).click();
    // await expect(page.getByRole('main')).toContainText('testFranchise');

    await expect(page.locator('#navbar-dark')).toContainText('Logout');
    await page.getByRole('link', { name: 'Logout' }).click();
    await expect(page.locator('#navbar-dark')).toContainText('Login');


});

test('not found page', async ({ page }) => {
    await page.goto('http://localhost:5173/notfound');
    await expect(page.getByRole('list')).toContainText('notfound');
    await expect(page.getByText('Oops')).toBeVisible();
});


test('create franchisee', async ({ page }) => {

    //register mock
    await page.route('*/**/api/auth', async (route) => {
        if (route.request().method() == 'PUT') {
            if (route.request().postDataJSON().email == 'a@jwt.com'){
                const loginReq = { email: 'a@jwt.com', password: 'admin' };
                const loginRes = { user: { id: 3, name: 'admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdef' };
                expect(route.request().method()).toBe('PUT');
                expect(route.request().postDataJSON()).toMatchObject(loginReq);
                await route.fulfill({ json: loginRes });
            }
            else if (route.request().postDataJSON().email == 'f@jwt.com'){
                const loginReq = { email: 'f@jwt.com', password: 'franchisee' };
                const loginRes = { user: { id: 3, name: 'franchisee', email: 'f@jwt.com', roles: [{ role: 'franchisee' }] }, token: 'abcdef' };
                expect(route.request().method()).toBe('PUT');
                expect(route.request().postDataJSON()).toMatchObject(loginReq);
                await route.fulfill({ json: loginRes });    
            }
        }
        else if (route.request().method() == 'DELETE') {
            const logoutRes = { message: 'logout successful' };
            expect(route.request().method()).toBe('DELETE');
            await route.fulfill({ json: logoutRes });
        }
      });

    //create franchisee mock
    await page.route('*/**/api/franchise', async (route) => {

        if (route.request().method() == 'POST') {
        const createFranchiseReq = {
            name: 'test franchise',
            admins: [{email: 'f@jwt.com'}]
        }
        const createFranchiseRes = { 
            name: 'test franchise', 
            admins: [
                {
                    email: 'f@jwt.com',
                    id: 3,
                    name: 'franchisee'
                }
            ],
            id: 2
        };
        expect(route.request().method()).toBe('POST');
        expect(route.request().postDataJSON()).toMatchObject(createFranchiseReq);
        await route.fulfill({ json: createFranchiseRes });
    }
    });

    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('');
    await page.getByRole('textbox', { name: 'Full name' }).click();
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Add Franchise' }).click();
    await page.getByRole('textbox', { name: 'franchise name' }).click();
    await page.getByRole('textbox', { name: 'franchise name' }).fill('test franchise');
    await page.getByRole('textbox', { name: 'franchisee admin email' }).click();
    await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('f@jwt.com');
    await page.getByRole('button', { name: 'Create' }).click();
    //   await page.getByRole('row', { name: 'test franchise pizza' }).getByRole('button').click();
    //   await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
    

  });