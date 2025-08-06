# 🧪 TableTech Test Suite

Deze map bevat alle tests voor het TableTech platform, georganiseerd per testtype.

## 📁 Structuur

```
tests/
├── unit/                 # Unit tests voor individuele componenten
│   ├── api/             # API unit tests
│   │   ├── components/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── controllers/
│   │   └── middleware/
│   ├── client-side/     # Client-side unit tests
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── kitchen-side/    # Kitchen-side unit tests
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── integration/         # Integratie tests
│   ├── api/            # API endpoint integratie
│   ├── database/       # Database integratie
│   ├── websocket/      # WebSocket communicatie
│   └── payment/        # Payment provider integratie
│
├── e2e/                # End-to-end tests
│   ├── customer-flows/ # Klant gebruikersflows
│   ├── kitchen-flows/  # Keuken gebruikersflows
│   └── admin-flows/    # Admin gebruikersflows
│
├── performance/        # Performance tests
│   └── scenarios/      # Performance test scenarios
│
├── security/          # Security tests
│   └── scans/         # Security scan resultaten
│
├── smoke/             # Smoke tests
│   └── critical-paths/ # Kritieke paden
│
├── regression/        # Regressie tests
│   └── bug-fixes/     # Tests voor bug fixes
│
├── load/              # Load tests
│   └── stress-tests/  # Stress test scenarios
│
├── config/            # Test configuraties
├── helpers/           # Gedeelde test helpers
├── mocks/             # Mock data en services
├── fixtures/          # Test fixtures
├── reports/           # Test rapporten
└── coverage/          # Coverage rapporten
```

## 🎯 Test Types

### Unit Tests
Testen van individuele functies, componenten en services in isolatie.
- **Locatie**: `/unit/`
- **Framework**: Jest
- **Coverage doel**: >80%

### Integration Tests
Testen van interacties tussen verschillende componenten.
- **Locatie**: `/integration/`
- **Framework**: Jest + Supertest (API)
- **Focus**: API endpoints, database operaties, externe services

### End-to-End Tests
Complete gebruikersflows van begin tot eind.
- **Locatie**: `/e2e/`
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari, Mobile

### Performance Tests
Prestatie en snelheid van de applicatie.
- **Locatie**: `/performance/`
- **Tools**: K6, Artillery
- **Metrics**: Response tijd, throughput, resource gebruik

### Security Tests
Beveiligingskwetsbaarheden en compliance.
- **Locatie**: `/security/`
- **Tools**: OWASP ZAP, npm audit
- **Checks**: XSS, SQL injection, authentication

### Smoke Tests
Snelle tests voor kritieke functionaliteit.
- **Locatie**: `/smoke/`
- **Duur**: <5 minuten
- **Wanneer**: Bij elke deployment

### Regression Tests
Voorkomen dat oude bugs terugkomen.
- **Locatie**: `/regression/`
- **Wanneer**: Bij elke bug fix
- **Regel**: Elke bug krijgt een regressie test

### Load Tests
Testen onder hoge belasting.
- **Locatie**: `/load/`
- **Tools**: K6, JMeter
- **Scenarios**: Normale load, piek load, stress test

## 🚀 Test Commando's

```bash
# Alle tests
npm test

# Unit tests
npm run test:unit

# Integratie tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# Smoke tests (snel)
npm run test:smoke

# Coverage rapport
npm run test:coverage
```

## 📊 Coverage Doelen

| Component | Minimum Coverage |
|-----------|-----------------|
| API Services | 80% |
| Controllers | 75% |
| Utils | 90% |
| React Components | 70% |
| Hooks | 80% |
| Critical Paths | 100% |

## 🔧 Test Configuratie

Configuratie bestanden zijn te vinden in `/config/`:
- `jest.config.js` - Jest configuratie
- `playwright.config.js` - Playwright configuratie
- `test.env` - Test environment variabelen

## 📝 Best Practices

1. **Naming Convention**: 
   - Unit tests: `[component].test.ts`
   - Integration: `[feature].integration.test.ts`
   - E2E: `[flow].e2e.test.ts`

2. **Test Isolatie**: 
   - Elke test moet onafhankelijk zijn
   - Gebruik beforeEach/afterEach voor cleanup
   - Mock externe dependencies

3. **Test Data**:
   - Gebruik fixtures voor test data
   - Geen hardcoded waarden in tests
   - Reset database voor integratie tests

4. **Assertions**:
   - Duidelijke, specifieke assertions
   - Test één ding per test
   - Gebruik descriptieve test namen

## 🐛 Debugging

Voor debugging van tests:

```bash
# Jest debug mode
npm run test:debug

# Playwright headed mode
npm run test:e2e:headed

# Specifieke test file
npm test -- path/to/test.ts
```

## 📈 Rapportage

Test resultaten worden opgeslagen in:
- `/reports/` - HTML test rapporten
- `/coverage/` - Coverage rapporten
- CI/CD pipeline artifacts

## 🤝 Contributing

Bij het toevoegen van nieuwe tests:
1. Plaats de test in de juiste map
2. Volg de naming conventions
3. Update deze README indien nodig
4. Zorg voor adequate coverage
5. Run alle gerelateerde tests lokaal