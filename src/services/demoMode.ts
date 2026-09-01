/**
 * 체험 모드: Firebase/카카오 API 키 없이 앱을 눌러볼 수 있게 하는 로컬 전용 모드입니다.
 * Firestore를 전혀 호출하지 않고, 메모리 안의 목 데이터만 읽고 씁니다 — 새로고침하면 초기화됩니다.
 * sessionStorage에만 플래그를 두므로(8절 원칙: 상태 저장소로 localStorage를 쓰지 않음),
 * 다른 탭이나 다음 방문에 영향을 주지 않습니다.
 */
const DEMO_MODE_KEY = 'trip-demo-mode';

export function isDemoMode(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  try {
    window.sessionStorage.setItem(DEMO_MODE_KEY, '1');
  } catch {
    // 저장 실패해도 무해합니다 — 체험 모드가 켜지지 않을 뿐.
  }
  window.location.href = '/';
}

export function exitDemoMode(): void {
  try {
    window.sessionStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // no-op
  }
  window.location.href = '/';
}
