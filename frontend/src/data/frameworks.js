export const FRAMEWORKS = [
  {
    id: 'Selenium',
    label: 'Selenium',
    desc: 'Cross-browser UI automation via WebDriver. Works with almost any language.',
    sample: `// LoginPage.java — Page Object Model
public class LoginPage {
  WebDriver driver;
  By username = By.id("username");
  By password = By.id("password");
  By submit   = By.cssSelector("button[type=submit]");

  public LoginPage(WebDriver driver) { this.driver = driver; }

  public void login(String user, String pass) {
    driver.findElement(username).sendKeys(user);
    driver.findElement(password).sendKeys(pass);
    driver.findElement(submit).click();
  }
}

// LoginTest.java
@Test
public void validLoginRedirectsToDashboard() {
  LoginPage login = new LoginPage(driver);
  login.login("qa_user", "P@ssw0rd");
  assertTrue(driver.getCurrentUrl().contains("/dashboard"));
}`,
    fileTree: `project-root/
├── src/
│   ├── main/java/pages/
│   │   ├── LoginPage.java
│   │   └── DashboardPage.java
│   └── test/java/tests/
│       ├── LoginTest.java
│       └── DashboardTest.java
├── src/test/resources/
│   └── testdata.json
├── pom.xml
└── README.md`,
    layouts: [
      { id: 'pom', label: 'Page Object Model', desc: 'One class per page, locators + actions encapsulated.' },
      { id: 'screenplay', label: 'Screenplay Pattern', desc: 'Actor-based, task/question composition.' },
      { id: 'data-driven', label: 'Data-Driven Layout', desc: 'Test logic separated from external data sources.' },
    ],
  },
  {
    id: 'TestNG',
    label: 'TestNG',
    desc: 'Java test framework with annotations, suites, and parallel execution.',
    sample: `@Test(priority = 1, groups = "smoke")
public void addToCartUpdatesCount() {
  ProductPage product = new ProductPage(driver);
  product.addToCart("SKU-1042");
  Assert.assertEquals(product.getCartCount(), 1);
}

@BeforeMethod
public void setUp() {
  driver = new ChromeDriver();
}`,
    fileTree: `project-root/
├── src/test/java/
│   ├── pages/ProductPage.java
│   └── tests/CartTest.java
├── testng.xml
├── pom.xml
└── README.md`,
    layouts: [
      { id: 'suite-xml', label: 'Suite XML Driven', desc: 'testng.xml controls suites, groups, parallelism.' },
      { id: 'pom', label: 'Page Object Model', desc: 'Combined with TestNG annotations for lifecycle.' },
    ],
  },
  {
    id: 'Robot Framework',
    label: 'Robot Framework',
    desc: 'Keyword-driven, readable syntax — good for mixed technical/non-technical teams.',
    sample: `*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Valid Login Shows Dashboard
    Open Browser    https://app.example.com    chrome
    Input Text      id:username    qa_user
    Input Text      id:password    P@ssw0rd
    Click Button    css:button[type=submit]
    Wait Until Page Contains    Dashboard`,
    fileTree: `project-root/
├── resources/
│   └── common_keywords.robot
├── tests/
│   ├── login.robot
│   └── checkout.robot
├── data/testdata.csv
└── README.md`,
    layouts: [
      { id: 'keyword-driven', label: 'Keyword-Driven', desc: 'Reusable keywords in resource files.' },
      { id: 'data-driven', label: 'Data-Driven', desc: 'Test templates fed by external data tables.' },
    ],
  },
  {
    id: 'Cucumber',
    label: 'Cucumber',
    desc: 'BDD-style Gherkin feature files mapped to step definitions.',
    sample: `# login.feature
Feature: Login
  Scenario: Valid credentials redirect to dashboard
    Given the user is on the login page
    When they submit valid credentials
    Then they should see the dashboard

// LoginSteps.java
@When("they submit valid credentials")
public void submitValidCredentials() {
  loginPage.login("qa_user", "P@ssw0rd");
}`,
    fileTree: `project-root/
├── src/test/resources/features/
│   └── login.feature
├── src/test/java/steps/
│   └── LoginSteps.java
├── src/test/java/runners/
│   └── TestRunner.java
└── pom.xml`,
    layouts: [
      { id: 'bdd-standard', label: 'Standard BDD', desc: 'Feature files + step definitions + hooks.' },
      { id: 'screenplay-bdd', label: 'Screenplay + BDD', desc: 'Actor-based steps behind Gherkin.' },
    ],
  },
  {
    id: 'Playwright',
    label: 'Playwright',
    desc: 'Modern, fast browser automation with auto-waiting. TypeScript-first.',
    sample: `import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('valid login redirects to dashboard', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('qa_user', 'P@ssw0rd');
  await expect(page).toHaveURL(/dashboard/);
});`,
    fileTree: `project-root/
├── pages/
│   └── LoginPage.ts
├── tests/
│   ├── login.spec.ts
│   └── checkout.spec.ts
├── playwright.config.ts
└── package.json`,
    layouts: [
      { id: 'pom', label: 'Page Object Model', desc: 'Fixtures + page objects, TypeScript-first.' },
      { id: 'component', label: 'Component Testing Layout', desc: 'Co-located component + test files.' },
    ],
  },
  {
    id: 'PyTest',
    label: 'PyTest',
    desc: 'Lightweight, fixture-driven Python testing — great for API and UI tests.',
    sample: `# test_login.py
import pytest
from pages.login_page import LoginPage

def test_valid_login_redirects_to_dashboard(driver):
    login = LoginPage(driver)
    login.login("qa_user", "P@ssw0rd")
    assert "dashboard" in driver.current_url

# conftest.py
@pytest.fixture
def driver():
    d = webdriver.Chrome()
    yield d
    d.quit()`,
    fileTree: `project-root/
├── pages/login_page.py
├── tests/
│   ├── test_login.py
│   └── test_checkout.py
├── conftest.py
├── pytest.ini
└── requirements.txt`,
    layouts: [
      { id: 'fixtures', label: 'Fixture-Based', desc: 'conftest.py fixtures, marker-driven suites.' },
      { id: 'pom', label: 'Page Object Model', desc: 'POM classes consumed by pytest test functions.' },
    ],
  },
  {
    id: 'Customize',
    label: 'Customize',
    desc: 'Bring your own framework, conventions, and reference files.',
    sample: null,
    fileTree: null,
    layouts: [],
  },
]

export function getFramework(id) {
  return FRAMEWORKS.find((f) => f.id === id)
}
