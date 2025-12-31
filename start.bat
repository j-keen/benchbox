@echo off
echo ========================================
echo   BenchBox 시작 중...
echo ========================================
echo.

REM 의존성 설치 확인
if not exist "node_modules" (
    echo [1/3] 루트 의존성 설치 중...
    call npm install
)

if not exist "client\node_modules" (
    echo [2/3] 클라이언트 의존성 설치 중...
    cd client
    call npm install
    cd ..
)

if not exist "server\node_modules" (
    echo [3/3] 서버 의존성 설치 중...
    cd server
    call npm install
    cd ..
)

echo.
echo ========================================
echo   앱 실행 중...
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:3000
echo ========================================
echo.

call npm run dev
