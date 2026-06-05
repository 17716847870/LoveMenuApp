import { BootstrapResponse } from '../types/phaseOne';

export function routeForNextStep(nextStep: BootstrapResponse['next_step']) {
  switch (nextStep) {
    case 'select_role':
      return 'RoleSelect';
    case 'bind':
    case 'wait_role_confirm':
      return 'Bind';
    case 'role_confirm':
      return 'RoleConfirm';
    case 'home':
      return 'MainTabs';
    default:
      return 'Bind';
  }
}
