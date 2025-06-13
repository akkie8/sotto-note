/**
 * 環境変数でメンテナンスモードを制御
 * IS_MAINTENANCE=true でメンテナンスページ表示
 */
export function getMaintenanceStatus(): boolean {
  const isMaintenanceEnv = process.env.IS_MAINTENANCE;
  const isMaintenanceMode = isMaintenanceEnv === "true" || isMaintenanceEnv === "1";
  
  console.log(`[Maintenance] IS_MAINTENANCE=${isMaintenanceEnv}, mode=${isMaintenanceMode}`);
  
  return isMaintenanceMode;
}