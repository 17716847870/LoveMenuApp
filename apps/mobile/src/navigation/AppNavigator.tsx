import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarDays, House, MessageCircle, ReceiptText, UserRound, UtensilsCrossed } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTopBar } from '../components/AppTopBar';
import { BindScreen } from '../screens/phase1/BindScreen';
import { ChatScreen } from '../screens/phase1/ChatScreen';
import { CategoryManageScreen } from '../screens/phase1/CategoryManageScreen';
import { HomeScreen } from '../screens/phase1/HomeScreen';
import { LoginScreen } from '../screens/phase1/LoginScreen';
import { AnniversariesScreen } from '../screens/phase1/AnniversariesScreen';
import { AnniversaryDetailScreen } from '../screens/phase1/AnniversaryDetailScreen';
import { AnniversaryEditorScreen } from '../screens/phase1/AnniversaryEditorScreen';
import { ApplicationListScreen } from '../screens/phase1/ApplicationListScreen';
import { AccountSettingsScreen } from '../screens/phase1/AccountSettingsScreen';
import { GeneralSettingsScreen } from '../screens/phase1/GeneralSettingsScreen';
import { MenuDetailScreen } from '../screens/phase1/MenuDetailScreen';
import { MenuFormScreen } from '../screens/phase1/MenuFormScreen';
import { MenuListScreen } from '../screens/phase1/MenuListScreen';
import { CreateApplicationScreen } from '../screens/phase1/CreateApplicationScreen';
import { HandleApplicationScreen } from '../screens/phase1/HandleApplicationScreen';
import { ImagePreviewScreen } from '../screens/phase1/ImagePreviewScreen';
import { OrderConfirmScreen } from '../screens/phase1/OrderConfirmScreen';
import { OrderDetailScreen } from '../screens/phase1/OrderDetailScreen';
import { OrderFeedbackScreen } from '../screens/phase1/OrderFeedbackScreen';
import { OrdersScreen } from '../screens/phase1/OrdersScreen';
import { PeriodAnalysisScreen } from '../screens/phase1/PeriodAnalysisScreen';
import { PeriodCycleSettingsScreen } from '../screens/phase1/PeriodCycleSettingsScreen';
import { PeriodDailyRecordScreen } from '../screens/phase1/PeriodDailyRecordScreen';
import { PeriodDailySummaryScreen } from '../screens/phase1/PeriodDailySummaryScreen';
import { PeriodHistoryCycleEditorScreen } from '../screens/phase1/PeriodHistoryCycleEditorScreen';
import { PeriodHomeScreen } from '../screens/phase1/PeriodHomeScreen';
import { ProfileScreen } from '../screens/phase1/ProfileScreen';
import { RoleConfirmScreen } from '../screens/phase1/RoleConfirmScreen';
import { RoleSelectScreen } from '../screens/phase1/RoleSelectScreen';
import { AuthorizationScreen } from '../screens/phase1/AuthorizationScreen';
import { PredictionScreen } from '../screens/phase1/PredictionScreen';
import { RemindersScreen } from '../screens/phase1/RemindersScreen';
import { SplashScreen } from '../screens/phase1/SplashScreen';
import { StatsScreen } from '../screens/phase1/StatsScreen';
import { SessionsScreen } from '../screens/phase1/SessionsScreen';
import { ThemeScreen } from '../screens/phase1/ThemeScreen';
import { TimelineScreen } from '../screens/phase1/TimelineScreen';
import { PostToSpaceScreen } from '../screens/phase1/PostToSpaceScreen';
import { VoiceRecordingScreen } from '../screens/phase1/VoiceRecordingScreen';
import { WheelScreen } from '../screens/phase1/WheelScreen';
import { useAppTheme } from '../theme/useAppTheme';
import { getNavigationTheme } from '../theme/themes';

export type RootTabParamList = {
  Home: undefined;
  Period: undefined;
  Menu: undefined;
  Sessions: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  RoleSelect: undefined;
  Bind: undefined;
  RoleConfirm: undefined;
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  CategoryManage: undefined;
  MenuForm:
    | {
        menuId?: number;
        sourceRequestId?: number;
        initialTitle?: string;
        initialDescription?: string | null;
        initialRemark?: string | null;
      }
    | undefined;
  MenuDetail: { menuId: number };
  ImagePreview: { imageUri?: string; caption?: string } | undefined;
  VoiceRecording: undefined;
  OrderConfirm: { menuId?: number; menuIds?: number[] };
  OrderDetail: { orderId: number };
  OrderFeedback: { orderId?: number } | undefined;
  PostToSpace: undefined;
  Chat: undefined;
  PeriodDailyRecord: undefined;
  PeriodCycleSettings: undefined;
  PeriodHistoryCycleEditor: { date: string };
  PeriodDailySummary: undefined;
  PeriodAnalysis: undefined;
  Authorization: undefined;
  Reminders: undefined;
  Prediction: undefined;
  Timeline: undefined;
  Anniversaries: { refreshToken?: number } | undefined;
  AnniversaryDetail: { reminderId: string };
  AnniversaryEditor: { reminderId?: string } | undefined;
  Wheel: undefined;
  ApplicationList: undefined;
  CreateApplication: undefined;
  HandleApplication: { applicationId: string };
  Stats: undefined;
  Theme: undefined;
  AccountSettings: undefined;
  GeneralSettings: undefined;
  StitchLab: undefined;
  StitchPreview: { stitchScreenId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type AppHeaderMode = 'title' | 'brand';

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function resolveHeaderConfig(routeName: string, title: string) {
  if (routeName === 'RoleConfirm') {
    return {
      title: 'LoveMenu',
      mode: 'brand' as AppHeaderMode,
      showBackButton: true,
    };
  }

  return {
    title,
    mode: 'title' as AppHeaderMode,
    showBackButton: true,
  };
}

function BottomTabVisual({
  title,
  routeName,
  active,
}: {
  title: string;
  routeName: keyof RootTabParamList;
  active: boolean;
}) {
  const theme = useAppTheme();
  const activeColor = theme.colors.primary;
  const inactiveColor = withAlpha(theme.colors.textSoft, theme.dark ? 0.76 : 0.82);
  const dotColor = theme.colors.primary;
  const dotGlow = withAlpha(theme.colors.primarySoft, theme.dark ? 0.3 : 0.45);
  const Icon =
    routeName === 'Period'
      ? CalendarDays
      : routeName === 'Menu'
        ? UtensilsCrossed
        : routeName === 'Sessions'
          ? MessageCircle
          : routeName === 'Orders'
            ? ReceiptText
            : routeName === 'Profile'
              ? UserRound
              : House;
  const iconStrokeWidth = active ? 2.4 : 2.1;

  return (
    <View style={styles.tabVisual}>
      <Icon size={24} color={active ? activeColor : inactiveColor} strokeWidth={iconStrokeWidth} />
      <Text style={[styles.tabVisualLabel, { color: active ? activeColor : inactiveColor }]}>{title}</Text>
      <View style={styles.tabDotSlot}>
        {active ? <View style={[styles.tabDot, { backgroundColor: dotColor, shadowColor: dotGlow }]} /> : null}
      </View>
    </View>
  );
}

function TabNavigator() {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarBackground = appTheme.colors.tabBar;
  const tabBarShadow = withAlpha(appTheme.colors.primary, appTheme.dark ? 0.18 : 0.15);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: tabBarBackground,
          height: 70,
          borderTopWidth: 1,
          borderTopColor: withAlpha(appTheme.colors.cardBorder, appTheme.dark ? 0.62 : 0.72),
          marginHorizontal: 12,
          marginBottom: 0,
          borderRadius: 40,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom, 8),
          shadowColor: tabBarShadow,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 1,
          shadowRadius: 30,
          elevation: 18,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: appTheme.colors.primary,
        tabBarInactiveTintColor: appTheme.colors.textSoft,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="首页" routeName="Home" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Period"
        component={PeriodHomeScreen}
        options={{
          title: '经期',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="经期" routeName="Period" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuListScreen}
        options={{
          title: '菜单',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="菜单" routeName="Menu" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          title: '消息',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="消息" routeName="Sessions" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: '订单',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="订单" routeName="Orders" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <BottomTabVisual title="我的" routeName="Profile" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const appTheme = useAppTheme();

  return (
    <NavigationContainer theme={getNavigationTheme(appTheme)}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShadowVisible: false,
          header: ({ navigation, route, options }) => {
            const headerConfig = resolveHeaderConfig(route.name, options.title ?? route.name);
            return (
              <AppTopBar
                title={headerConfig.title}
                showBackButton={headerConfig.showBackButton && navigation.canGoBack()}
                onBack={() => navigation.goBack()}
                mode={headerConfig.mode}
              />
            );
          },
          contentStyle: { backgroundColor: appTheme.colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, title: '欢迎' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, title: '登录 / 注册' }} />
        <Stack.Screen
          name="RoleSelect"
          component={RoleSelectScreen}
          options={{ headerShown: false, title: '选择身份' }}
        />
        <Stack.Screen name="Bind" component={BindScreen} options={{ headerShown: false, title: '情侣绑定' }} />
        <Stack.Screen
          name="RoleConfirm"
          component={RoleConfirmScreen}
          options={{ headerShown: false, title: '角色确认' }}
        />
        <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false, title: '主页面' }} />
        <Stack.Screen
          name="CategoryManage"
          component={CategoryManageScreen}
          options={{ headerShown: false, title: '菜单分类管理' }}
        />
        <Stack.Screen
          name="MenuForm"
          component={MenuFormScreen}
          options={{ headerShown: false, title: '菜单创建 / 编辑' }}
        />
        <Stack.Screen
          name="MenuDetail"
          component={MenuDetailScreen}
          options={{ headerShown: false, title: '菜单详情' }}
        />
        <Stack.Screen
          name="ImagePreview"
          component={ImagePreviewScreen}
          options={{ headerShown: false, title: '图片预览' }}
        />
        <Stack.Screen
          name="VoiceRecording"
          component={VoiceRecordingScreen}
          options={{ headerShown: false, title: '语音录制' }}
        />
        <Stack.Screen
          name="OrderConfirm"
          component={OrderConfirmScreen}
          options={{ headerShown: false, title: '下单确认' }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ headerShown: false, title: '订单详情' }}
        />
        <Stack.Screen
          name="OrderFeedback"
          component={OrderFeedbackScreen}
          options={{ headerShown: false, title: '订单反馈' }}
        />
        <Stack.Screen
          name="PostToSpace"
          component={PostToSpaceScreen}
          options={{ headerShown: false, title: '发布动态' }}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false, title: '聊天详情' }} />
        <Stack.Screen
          name="PeriodDailyRecord"
          component={PeriodDailyRecordScreen}
          options={{ headerShown: false, title: '每日状态记录' }}
        />
        <Stack.Screen
          name="PeriodCycleSettings"
          component={PeriodCycleSettingsScreen}
          options={{ headerShown: false, title: '本次经期设置' }}
        />
        <Stack.Screen
          name="PeriodHistoryCycleEditor"
          component={PeriodHistoryCycleEditorScreen}
          options={{ headerShown: false, title: '调整历史经期' }}
        />
        <Stack.Screen
          name="PeriodDailySummary"
          component={PeriodDailySummaryScreen}
          options={{ headerShown: false, title: '今日记录详情' }}
        />
        <Stack.Screen
          name="PeriodAnalysis"
          component={PeriodAnalysisScreen}
          options={{ headerShown: false, title: '周期分析' }}
        />
        <Stack.Screen
          name="Authorization"
          component={AuthorizationScreen}
          options={{ headerShown: false, title: '经期授权' }}
        />
        <Stack.Screen
          name="Reminders"
          component={RemindersScreen}
          options={{ headerShown: false, title: '提醒设置' }}
        />
        <Stack.Screen
          name="Prediction"
          component={PredictionScreen}
          options={{ headerShown: false, title: '预测详情' }}
        />
        <Stack.Screen name="Timeline" component={TimelineScreen} options={{ headerShown: false, title: '情侣空间' }} />
        <Stack.Screen
          name="Anniversaries"
          component={AnniversariesScreen}
          options={{ headerShown: false, title: '纪念日' }}
        />
        <Stack.Screen
          name="AnniversaryDetail"
          component={AnniversaryDetailScreen}
          options={{ headerShown: false, title: '提醒详情' }}
        />
        <Stack.Screen
          name="AnniversaryEditor"
          component={AnniversaryEditorScreen}
          options={{ headerShown: false, title: '编辑提醒' }}
        />
        <Stack.Screen name="Wheel" component={WheelScreen} options={{ headerShown: false, title: '今天吃什么' }} />
        <Stack.Screen
          name="ApplicationList"
          component={ApplicationListScreen}
          options={{ headerShown: false, title: '菜单申请列表' }}
        />
        <Stack.Screen
          name="CreateApplication"
          component={CreateApplicationScreen}
          options={{ headerShown: false, title: '发起申请' }}
        />
        <Stack.Screen
          name="HandleApplication"
          component={HandleApplicationScreen}
          options={{ headerShown: false, title: '申请处理' }}
        />
        <Stack.Screen name="Stats" component={StatsScreen} options={{ headerShown: false, title: '数据统计' }} />
        <Stack.Screen name="Theme" component={ThemeScreen} options={{ headerShown: false, title: '主题切换' }} />
        <Stack.Screen
          name="AccountSettings"
          component={AccountSettingsScreen}
          options={{ headerShown: false, title: '账号设置' }}
        />
        <Stack.Screen
          name="GeneralSettings"
          component={GeneralSettingsScreen}
          options={{ headerShown: false, title: '通用设置' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabVisual: {
    minWidth: 64,
    minHeight: 56,
    paddingHorizontal: 8,
    paddingTop: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabVisualLabel: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  tabDotSlot: {
    height: 8,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
});
