# DAO Integration Testing Guide

이 문서는 Tokamak Network Terminal의 DAO 기능에 대한 통합테스트 가이드를 제공합니다.

## 개요

DAO 테스트는 Tokamak Network의 DAO(Decentralized Autonomous Organization) 기능이 올바르게 작동하는지 확인하는 통합테스트입니다. 이 테스트는 실제 블록체인과의 상호작용을 통해 DAO 관련 모든 기능을 검증합니다.

### MCP 서버 특성에 맞는 테스트 설계

이 테스트는 MCP(Model Context Protocol) 서버의 특성을 고려하여 설계되었습니다:

- **단순한 요청-응답 구조**: 각 도구는 독립적으로 작동
- **블록체인 의존성**: 실제 성능은 블록체인 RPC 응답에 의존
- **도구 중심 설계**: 복잡한 상태 관리나 동시성 처리가 불필요
- **실용적 접근**: 기본 기능 검증과 에러 핸들링에 집중

## 테스트 구조

### 테스트 파일 구성

```
tests/
├── test-dao-integration.js              # 기본 DAO 통합테스트
├── test-dao-integration-comprehensive.js # 포괄적 DAO 통합테스트
├── run-dao-tests.js                     # 통합 테스트 러너
└── README.md                           # 테스트 개요
```

### 테스트 카테고리

#### 1. 기본 통합테스트 (`test-dao-integration.js`)
- **목적**: 핵심 DAO 기능의 기본 동작 검증
- **범위**:
  - DAO 멤버 수 조회
  - DAO 멤버 후보자 정보 조회
  - DAO 멤버 오퍼레이터 매니저 정보 조회
  - DAO 멤버십 확인
  - DAO 스테이킹 정보 조회
  - DAO 활동 보상 조회

#### 2. 포괄적 통합테스트 (`test-dao-integration-comprehensive.js`)
- **목적**: 모든 DAO 기능의 완전한 검증
- **범위**:
  - 모든 기본 기능을 mainnet과 sepolia 네트워크에서 테스트
  - 에러 핸들링 테스트
  - 성능 테스트
  - 체계적인 테스트 결과 보고



## DAO 기능 테스트 범위

### 1. DAO 멤버 관리
```javascript
// DAO 멤버 수 조회
get-dao-member-count

// DAO 멤버 후보자 정보 조회
get-dao-member-candidate-info

// DAO 멤버 오퍼레이터 매니저 정보 조회
get-dao-member-operator-manager-info

// DAO 멤버십 확인
check-dao-membership
```

### 2. DAO 스테이킹 정보
```javascript
// DAO 멤버 스테이킹 정보 조회
get-dao-members-staking-info

// 옵션: includeOperatorManager (true/false)
```

### 3. DAO 활동 보상
```javascript
// DAO 후보자 활동 보상 조회
dao-candidate-activity-reward

// 옵션: claim (true/false)
```

## 테스트 실행 방법

### 1. 사전 준비

```bash
# 프로젝트 빌드
npm run build

# 의존성 확인
npm install
```

### 2. 개별 테스트 실행

```bash
# 기본 DAO 테스트
node tests/test-dao-integration.js

# 포괄적 DAO 테스트
node tests/test-dao-integration-comprehensive.js


```

### 3. 통합 테스트 러너 사용

```bash
# 모든 DAO 테스트 실행
npm run test:dao:all

# 기본 테스트만 실행
npm run test:dao:basic

# 포괄적 테스트만 실행
npm run test:dao:comprehensive


```

### 4. 커맨드 라인 옵션

```bash
# 도움말 보기
node tests/run-dao-tests.js --help

# 특정 네트워크에서 테스트
node tests/run-dao-tests.js --comprehensive --network=mainnet
node tests/run-dao-tests.js --comprehensive --network=sepolia
```

## 테스트 결과 해석

### 성공 지표
- ✅ **PASS**: 테스트가 성공적으로 완료됨
- **응답 시간**: 일반적으로 1-5초 이내
- **데이터 형식**: 올바른 JSON 응답
- **네트워크 연결**: 안정적인 블록체인 연결

### 실패 지표
- ❌ **FAIL**: 테스트가 실패함
- **에러 메시지**: 구체적인 실패 원인
- **타임아웃**: 네트워크 지연 또는 서버 문제
- **컨트랙트 오류**: 블록체인 컨트랙트 호출 실패

### 성능 지표
```javascript
// 테스트 결과 예시
{
  "totalTests": 15,
  "passedTests": 14,
  "failedTests": 1,
  "successRate": "93.33%",
  "averageResponseTime": "2.3s",
  "totalDuration": "34.5s"
}
```

## 네트워크별 테스트

### Mainnet 테스트
- **목적**: 실제 운영 환경 검증
- **특징**: 실제 블록체인 데이터 사용
- **주의사항**: 가스비 발생 가능성

### Sepolia 테스트
- **목적**: 테스트넷 환경 검증
- **특징**: 테스트 데이터 사용
- **장점**: 안전한 테스트 환경

## 에러 핸들링 테스트

### 1. 잘못된 주소 형식
```javascript
// 테스트 케이스
check-dao-membership({
  address: "invalid-address",
  network: "mainnet"
})
```

### 2. 존재하지 않는 컨트랙트
```javascript
// 테스트 케이스
dao-candidate-activity-reward({
  candidateContract: "0x0000000000000000000000000000000000000000",
  network: "mainnet"
})
```

### 3. 네트워크 연결 실패
- RPC 엔드포인트 접근 불가
- 네트워크 타임아웃
- 블록체인 노드 문제

## 성능 테스트

### 1. 응답 시간 측정
```javascript
const startTime = Date.now();
// DAO 함수 호출
const endTime = Date.now();
const responseTime = endTime - startTime;
```

### 2. 동시 요청 처리
```javascript
// 여러 요청을 동시에 처리하는 테스트
const promises = [];
for (let i = 0; i < 5; i++) {
  promises.push(daoMemberCountRequest());
}
const results = await Promise.all(promises);
```

### 3. 메모리 사용량 모니터링
```javascript
// Node.js 메모리 사용량 확인
const memUsage = process.memoryUsage();
console.log(`Memory usage: ${memUsage.heapUsed / 1024 / 1024} MB`);
```

## 테스트 환경 설정

### 1. 환경 변수
```bash
# 네트워크 설정
export NETWORK=mainnet
export RPC_ENDPOINT=https://mainnet.infura.io/v3/YOUR_KEY

# 테스트 설정
export TEST_TIMEOUT=30000
export TEST_DELAY=2000
```

### 2. 타임아웃 설정
```javascript
const TEST_CONFIG = {
  timeout: 30000,  // 30초
  delay: 2000,     // 2초 간격
  retryAttempts: 3 // 재시도 횟수
};
```

### 3. 네트워크별 설정
```javascript
const NETWORK_CONFIG = {
  mainnet: {
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_KEY",
    chainId: 1,
    timeout: 30000
  },
  sepolia: {
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
    chainId: 11155111,
    timeout: 20000
  }
};
```

## 문제 해결

### 일반적인 문제들

#### 1. 빌드 오류
```bash
❌ Error: dist directory not found
```
**해결책**:
```bash
npm run build
```

#### 2. 네트워크 타임아웃
```bash
⏰ Test timed out
```
**해결책**:
- 네트워크 연결 확인
- RPC 엔드포인트 상태 확인
- 타임아웃 설정 증가

#### 3. 메모리 부족
```bash
❌ JavaScript heap out of memory
```
**해결책**:
```bash
node --max-old-space-size=4096 tests/run-dao-tests.js
```

#### 4. 컨트랙트 오류
```bash
❌ FAIL: Contract call failed
```
**해결책**:
- 컨트랙트 주소 확인
- 네트워크 설정 확인
- 블록체인 상태 확인

### 디버깅 팁

#### 1. 로그 레벨 설정
```javascript
// 상세한 로그 출력
const DEBUG = true;
if (DEBUG) {
  console.log('Request:', request);
  console.log('Response:', response);
}
```

#### 2. 네트워크 상태 확인
```javascript
// RPC 엔드포인트 상태 확인
const checkNetworkStatus = async () => {
  try {
    const blockNumber = await getBlockNumber();
    console.log('Network is accessible, current block:', blockNumber);
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

#### 3. 컨트랙트 상태 확인
```javascript
// 컨트랙트 존재 여부 확인
const checkContractExists = async (address) => {
  try {
    const code = await getCode({ address });
    return code !== '0x';
  } catch (error) {
    return false;
  }
};
```

## 테스트 커스터마이징

### 1. 새로운 테스트 추가
```javascript
// tests/test-dao-custom.js
import { spawn } from 'child_process';

async function runCustomTest() {
  const serverProcess = spawn('node', ['dist/src/index.js']);

  // 테스트 로직 구현
  sendRequest('tools/call', {
    name: 'get-dao-member-count',
    arguments: { network: 'mainnet' }
  });

  // 결과 처리
  serverProcess.stdout.on('data', (data) => {
    const response = JSON.parse(data.toString());
    console.log('Test result:', response);
  });
}
```

### 2. 테스트 설정 변경
```javascript
// 테스트 설정 커스터마이징
const CUSTOM_CONFIG = {
  timeout: 60000,        // 60초 타임아웃
  delay: 1000,          // 1초 간격
  networks: ['mainnet'], // mainnet만 테스트
  retryAttempts: 5      // 5회 재시도
};
```

### 3. 성능 모니터링
```javascript
// 성능 측정 함수
const measurePerformance = async (testFunction) => {
  const startTime = Date.now();
  const result = await testFunction();
  const endTime = Date.now();

  return {
    result,
    duration: endTime - startTime,
    timestamp: new Date().toISOString()
  };
};
```

## CI/CD 통합

### 1. GitHub Actions 예시
```yaml
# .github/workflows/dao-tests.yml
name: DAO Tests

on: [push, pull_request]

jobs:
  dao-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Build project
      run: npm run build

    - name: Run DAO tests
      run: npm run test:dao:all

    - name: Upload test results
      uses: actions/upload-artifact@v2
      with:
        name: dao-test-results
        path: test-results/
```

### 2. 테스트 결과 리포트
```javascript
// 테스트 결과를 JSON 파일로 저장
const saveTestResults = (results) => {
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };

  fs.writeFileSync('test-results/dao-test-report.json', JSON.stringify(report, null, 2));
};
```

## 모니터링 및 알림

### 1. 테스트 상태 모니터링
```javascript
// 테스트 상태 추적
const testStatus = {
  running: false,
  startTime: null,
  completedTests: 0,
  totalTests: 0,
  errors: []
};

const updateTestStatus = (status) => {
  Object.assign(testStatus, status);
  console.log('Test Status:', testStatus);
};
```

### 2. 알림 설정
```javascript
// 슬랙 알림 예시
const sendSlackNotification = async (message) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  }
};
```

## 결론

DAO 통합테스트는 Tokamak Network Terminal의 핵심 기능 중 하나인 DAO 관련 기능들이 올바르게 작동하는지 확인하는 중요한 과정입니다. 이 가이드를 통해 체계적이고 효과적인 DAO 테스트를 수행할 수 있습니다.

### 주요 포인트
1. **체계적인 테스트 구조**: 기본 → 포괄적 순서로 테스트
2. **네트워크별 검증**: mainnet과 sepolia 모두에서 테스트
3. **에러 핸들링**: 다양한 에러 상황에 대한 대응
4. **성능 모니터링**: 응답 시간 추적
5. **자동화**: CI/CD 파이프라인 통합

### 다음 단계
- 테스트 커버리지 향상
- 새로운 DAO 기능에 대한 테스트 추가
- 성능 최적화
- 모니터링 시스템 구축