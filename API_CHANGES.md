# Mehram — API Changes Reference

> **Scope:** All endpoint renames, additions, removals, DTO changes, and frontend wiring
> performed to align the NestJS backend with the Mehram app's onboarding flow.

---

## 1. Summary Table

| Change type | Count |
|---|---|
| New endpoints | 3 |
| Removed endpoints | 9 |
| Renamed endpoints | 3 |
| Unchanged endpoints | 5 |
| DTO changes | 5 |
| New frontend API modules | 9 |

---

## 2. Authentication — `/auth`

### 2.1 New Endpoints

| Method | Path | Description | Response |
|---|---|---|---|
| `POST` | `/auth/send-otp` | Send SMS OTP to a phone number via Supabase | `204 No Content` |
| `POST` | `/auth/verify-otp` | Verify SMS OTP; returns JWT access + refresh tokens | `200 AuthResponseDto` |
| `POST` | `/auth/resend-otp` | Resend SMS OTP to the same phone number | `204 No Content` |

**Request body — `/auth/send-otp` and `/auth/resend-otp`:**
```json
{ "phone": "+923001234567" }
```

**Request body — `/auth/verify-otp`:**
```json
{ "phone": "+923001234567", "otp": "123456" }
```

**Response — `/auth/verify-otp`:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "phone": "+923001234567",
    "accountType": "seeker",
    "onboardingComplete": false,
    "verificationStatus": "none",
    "isEntitled": false
  }
}
```

---

### 2.2 Removed Endpoints

These endpoints existed in the original backend but are not used by the Mehram app:

| Method | Old Path | Reason for Removal |
|---|---|---|
| `POST` | `/auth/register` | Replaced by phone OTP flow |
| `POST` | `/auth/login` | Replaced by phone OTP flow |
| `GET` | `/auth/oauth/google` | Not used in app |
| `GET` | `/auth/oauth/apple` | Not used in app |
| `POST` | `/auth/change-password` | No password concept in OTP auth |
| `POST` | `/auth/resend-verification` | Replaced by `/auth/resend-otp` |

---

### 2.3 Renamed Endpoints

| Method | Old Path | New Path |
|---|---|---|
| `POST` | `/auth/parent/redeem` | `/auth/wali/verification-code` |

**Reason:** The app uses the Islamic term "wali" for the guardian role, not "parent".

---

### 2.4 Unchanged Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/me` | Returns current user profile |
| `POST` | `/auth/refresh` | Refreshes access token using refresh token |
| `POST` | `/auth/logout` | Invalidates session |
| `DELETE` | `/auth/account` | Permanently deletes account |

---

## 3. Wali (Guardian) — `/wali`

**Controller rename:** `FamilyPortalController` (`/family`) → `WaliController` (`/wali`)

### 3.1 Renamed Endpoints

| Method | Old Path | New Path |
|---|---|---|
| `POST` | `/family/invitations` | `/wali/invite` |
| `POST` | `/family/invitations/redeem-code` | `/wali/invite/redeem-code` |

**Request body — `/wali/invite`:**
```json
{ "waliName": "Ahmed Khan", "relationship": "father" }
```

**Response — `/wali/invite`:**
```json
{
  "inviteCode": "ABC123",
  "inviteLink": "https://mehram.app/wali/ABC123",
  "expiresAt": "2025-09-01T00:00:00.000Z"
}
```

**Request body — `/wali/invite/redeem-code`:**
```json
{ "inviteCode": "ABC123" }
```

---

### 3.2 Removed Endpoints

These family-portal endpoints have no corresponding screen in the app:

| Method | Old Path | Reason for Removal |
|---|---|---|
| `GET` | `/family/invitations` | No screen lists pending invitations |
| `DELETE` | `/family/invitations/:id` | No screen cancels invitations |
| `GET` | `/family/memberships` | No screen manages memberships |
| `DELETE` | `/family/memberships/:id` | No screen removes memberships |
| `GET` | `/family/permissions` | No screen displays permissions |
| `PATCH` | `/family/permissions` | No screen edits permissions |

---

## 4. Profile — `/profile`

All profile endpoints were already correctly structured. Only DTOs changed.

### Endpoints (unchanged)

| Method | Path | Screen |
|---|---|---|
| `GET` | `/profile/me` | App startup session restore |
| `PUT` | `/profile/me` | EssentialsScreen (gender, DOB, marital status, bio) |
| `PATCH` | `/profile/me/location` | CountryScreen, CityScreen |
| `PUT` | `/profile/me/religious` | EssentialsScreen (sect) |
| `PUT` | `/profile/me/family-background` | FamilyAndHomeScreen |
| `PUT` | `/profile/me/preferences` | PreferencesScreen (age range) |
| `POST` | `/profile/me/photos/upload` | PhotosScreen |
| `DELETE` | `/profile/me/photos/:photoId` | PhotosScreen |
| `PATCH` | `/profile/me/privacy` | PhotosScreen (photo visibility) |

---

## 5. Verification — `/verifications`

| Method | Path | Description |
|---|---|---|
| `POST` | `/verifications` | Submit face scan or CNIC document |
| `GET` | `/verifications` | Get current verification status |

**Request body — face verification:**
```json
{ "type": "face", "scanData": "..." }
```

**Request body — CNIC verification:**
```json
{ "type": "cnic", "documentUri": "file://..." }
```

---

## 6. Billing — `/billing`

| Method | Path | Description |
|---|---|---|
| `POST` | `/billing/verify-purchase` | Verify IAP receipt; activates membership |
| `GET` | `/billing/entitlement` | Check if current user has paid access |

**Request body — `/billing/verify-purchase`** (matches `VerifyPurchaseDto`):
```json
{
  "purchaseToken": "<Play / App Store purchase token>",
  "productId": "mehram_membership",
  "source": "android_iap"
}
```

`purchaseToken` and `productId` are required and non-empty (max 1024 / 255 chars);
`source` is optional and one of `ios_iap` | `android_iap` | `card` | `local_wallet`
(defaults to `android_iap` server-side). The token is unique across users — one
already recorded for another account is rejected with 400.

**Response:** the created/updated `Subscription` row (`status`, `plan`, `tier`,
`expiresAt`, …), not `{ isEntitled }`. `status: "ACTIVE"` (or `"GRACE"`) means paid.

---

## 7. Matches — `/matches`

| Method | Path | Description |
|---|---|---|
| `GET` | `/matches/stats` | Returns total match count for the user |
| `GET` | `/matches/discover?limit=N` | Returns paginated candidate list |
| `GET` | `/matches/candidates/:targetUserId` | Returns full profile for one candidate |

---

## 8. DTO Changes

### 8.1 `SendOtpDto` (new file)

**File:** `src/modules/auth/dto/send-otp.dto.ts`

```typescript
export class SendOtpDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phone must be in E.164 format' })
  phone: string;
}
```

---

### 8.2 `ResendOtpDto` (new file)

**File:** `src/modules/auth/dto/resend-otp.dto.ts`

Same structure as `SendOtpDto`.

---

### 8.3 `VerifyOtpDto` (modified)

**File:** `src/modules/auth/dto/verify-otp.dto.ts`

| Field | Before | After |
|---|---|---|
| `email` | `@IsEmail() email: string` | _(removed)_ |
| `phone` | _(did not exist)_ | `@Matches(E.164) phone: string` |
| `otp` | `@Length(6,6) otp: string` | unchanged |

---

### 8.4 `UpdateProfileDto` (modified)

**File:** `src/modules/profile/dto/update-profile.dto.ts`

The following fields were made optional to allow partial profile saves from individual onboarding screens:

| Field | Before | After |
|---|---|---|
| `gender` | required | `@IsOptional()` |
| `dateOfBirth` | required | `@IsOptional()` |
| `maritalStatus` | required | `@IsOptional()` |
| `countryCode` | required | `@IsOptional()` (location saved via separate PATCH) |

---

### 8.5 `UpdateReligiousProfileDto` (modified)

**File:** `src/modules/profile/dto/update-religious-profile.dto.ts`

All fields made optional to allow saving only `sect` from EssentialsScreen:

| Field | Before | After |
|---|---|---|
| `sect` | required | `@IsOptional()` |
| `prayerFrequency` | required | `@IsOptional()` |
| `religiosityLevel` | required | `@IsOptional()` |

---

## 9. New Service Methods

### `AuthService`

**File:** `src/modules/auth/auth.service.ts`

Two methods added before the existing `login()` method:

```typescript
async sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await this.supabase.auth.signInWithOtp({ phone });
  assertNoSupabaseAuthError(error, 'Failed to send verification code');
}

async verifyPhoneOtp(phone: string, otp: string): Promise<AuthResponseDto> {
  const { data, error } = await this.supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms',
  });
  assertNoSupabaseAuthError(error, 'Invalid or expired verification code');
  if (!data.user || !data.session) throw new BadRequestException('Verification failed');
  const profile = await this.bootstrap.resolveOrCreateUser(data.user);
  return buildAuthResponse(profile, data.session);
}
```

---

## 10. New Frontend API Modules

All files created in `src/api/` and `src/storage/`:

| File | Purpose |
|---|---|
| `src/api/config.ts` | `API_BASE_URL` constant |
| `src/api/client.ts` | `apiRequest<T>` + `apiUpload<T>` HTTP client with Bearer token |
| `src/storage/authStorage.ts` | AsyncStorage token persistence (`@mehram_access_token`, `@mehram_refresh_token`) |
| `src/api/auth.ts` | `sendOtp`, `verifyOtp`, `resendOtp`, `getMe`, `logout`, `refreshTokens`, `verifyInviteCode` |
| `src/api/profile.ts` | All profile update functions + enum mappers for Prisma enums |
| `src/api/wali.ts` | `createWaliInvite`, `redeemWaliCode` |
| `src/api/verification.ts` | `submitFaceVerification`, `submitCnicVerification`, `getVerificationStatus` |
| `src/api/billing.ts` | `verifyPurchase`, `getEntitlement` |
| `src/api/matches.ts` | `getMatchStats`, `discoverProfiles`, `getCandidateProfile` |

---

## 11. Frontend Screens Wired

| Screen | File | API Calls Added |
|---|---|---|
| PhoneScreen | `PhoneScreen.tsx` | `sendOtp(phone)` |
| CodeScreen | `CodeScreen.tsx` | `verifyOtp(phone, otp)`, `resendOtp(phone)` |
| CountryScreen | `CountryScreen.tsx` | `updateLocation(countryCode)` |
| CityScreen | `CityScreen.tsx` | `updateLocation(countryCode, city)` |
| EssentialsScreen | `EssentialsScreen.tsx` | `updateEssentials(...)`, `updateSect(sect)` |
| FamilyAndHomeScreen | `FamilyAndHomeScreen.tsx` | `updateFamilyBackground(data)` |
| GuidedPromptScreen | `GuidedPromptScreen.tsx` | `updateBio(text)` |
| PreferencesScreen | `PreferencesScreen.tsx` | `updatePreferences(ageMin, ageMax)` |
| PhotosScreen | `PhotosScreen.tsx` | `updatePhotoPrivacy(visibility)` |
| WaliInviteScreen | `WaliInviteScreen.tsx` | `createWaliInvite(name, relationship)` |
| VerificationScreen | `VerificationScreen.tsx` | `submitFaceVerification(data)`, `submitCnicVerification(uri)` |
| PaymentScreen | `PaymentScreen.tsx` | `verifyPurchase(receipt, platform, productId)` (in App.tsx) |
| App.tsx | `App.tsx` | `getMe()` for session restore on startup |

---

## 12. Required Setup

Before running the app, install the new dependency and re-link iOS pods:

```bash
npm install
cd ios && pod install && cd ..
```

The new dependency added to `package.json`:

```json
"@react-native-async-storage/async-storage": "^2.1.2"
```

### Supabase Configuration

Phone OTP requires SMS to be enabled in the Supabase project:

1. Supabase Dashboard → Authentication → Providers → Phone
2. Enable Phone provider
3. Configure an SMS provider (Twilio, MessageBird, or Vonage)
4. Set `OTP_EXPIRY` to desired duration (default: 3600 seconds)

### IAP Integration (PaymentScreen)

The `verifyPurchase` call in `App.tsx` currently passes an empty receipt string as a placeholder. Before going to production, integrate an IAP SDK:

- **iOS/Android:** [react-native-iap](https://github.com/dooboolab-community/react-native-iap) or [RevenueCat](https://www.revenuecat.com/)
- Replace the `''` receipt with the actual receipt returned by the IAP SDK after a successful purchase

---

## 13. Enum Mappings (Frontend → Backend)

The frontend screen labels are mapped to Prisma enum values in `src/api/profile.ts`:

### Gender
| Screen label | Prisma enum |
|---|---|
| `'Male'` | `'MALE'` |
| `'Female'` | `'FEMALE'` |

### Marital Status
| Screen label | Prisma enum |
|---|---|
| `'Never married'` | `'NEVER_MARRIED'` |
| `'Divorced'` | `'DIVORCED'` |
| `'Widowed'` | `'WIDOWED'` |

### Sect
| Screen label | Prisma enum |
|---|---|
| `'Sunni (Hanafi)'` | `'SUNNI'` |
| `'Shia (Ithna Ashari)'` | `'SHIA'` |
| `'Ahmadi'` | `'AHMADI'` |
| `'Ismaili'` | `'ISMAILI'` |
| `'Other'` | `'OTHER'` |
| `'Prefer not to say'` | `'PREFER_NOT_SAY'` |

### Photo Visibility
| Screen label | Backend value |
|---|---|
| `'Only my Wali'` | `'WALI_ONLY'` |
| `'Mutual approval'` | `'MUTUAL_ONLY'` |
| `'Wali-approved matches'` | `'APPROVAL_REQUIRED'` |
| `'Public'` | `'PUBLIC'` |
