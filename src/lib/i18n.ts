export enum Locale {
    en = "en",
    vi = "vi",
}
  
export const DEFAULT_LOCALE = Locale.en;

export const isValidLocale = (locale: string): locale is Locale => {
    return Object.values(Locale).includes(locale as Locale);
};

// Translations
export const translations = {
    [Locale.en]: {
        auth :{
            loginSuccess: "Login successful!",
            createAccountSuccess: "Create Account Success",
            usernameTaken: 'Username already taken',
            emailExists: 'User with this email already exists',
            accountCreated: "Your account has been successfully created. Please check your email for the verification link.",
            notLoggedIn: 'Regret! You are not logged in',
            unauthorized: 'Unauthorized',
            logoutSuccess: 'Logout successful',
            bannedOrNotExist: "Your account has been banned or does not exist!",
            welcomeSubject: "Welcome to Our Service!",
            welcomeMessage: "Thank you for registering with us.",
            verifyMessage: "Please verify your email address by clicking the link below.",
            verifyLink: "Click here to verify your email",
            pinNote: "This code will expire in 15 minutes.",
            emailResent: "Email has been resent. Please check your inbox.",
            checkEmail: "Please check your email for the verification link",
            accountActivated: "Account has already been activated.",
            verificationEmailSent: "Verification email has been sent!",
            emailVerificationError: "Error sending verification email.",
            emailVerificationFailed: "Unable to send verification email.",
            accountNotActivated: "Your account has been registered but not activated yet.",
            userOrOtpNotFound: "User or OTP not found",
            accountAlreadyVerified: "Account already verified",
            invalidOtpCode: "Invalid OTP code",
            otpExpired: "OTP expired",
            emailVerifiedSuccessfully: "Email verified successfully",
            resendVerification: "Please check your email for the verification link or resend the activation email.",
        },
        services: {
            entityLimitMax: "The entity limit field has a maximum limit of",
            needMorePointsFirst: "You need",
            expiredPoints: "Your points have expired",
            needMorePointsSecond: "more points to perform this action.",
            invalidAppPassword: "Invalid app password",
            emailAlreadyUsedTimesFirst: "The email has already been used",
            emailAlreadyUsedTimesSecond: "times. Are you sure you want to continue?",
            tooManyUrlsFirst: "Cannot send more than",
            tooManyUrlsSecond: "URLs at once.",
            invalidUrls: "Invalid URL(s)",
            invalidIdRequest: "Invalid request. Please provide a list of valid IDs",
            noValidIndexes: "No valid indexes found for deletion.",
            indexNotFoundOrDeleted: "Index not found or already deleted.",
            deletedIndexesSuccessFirst: "Deleted",
            deletedIndexesSuccessSecond: "indexes successfully!"
        },
        token:{
            notFound: 'Token not found',
            valid: 'Token is valid!',
            noRefreshToken: 'No refresh token provided',
            refreshed: 'Token refreshed successfully',
            refreshFailed: 'Failed to refresh token',
            expired: 'Expired tokens!',
            invalid: 'Invalid token',
            invalidOrExpired: 'Invalid or expired token!'
        },
        user :{
            notFound: 'User not found',
            banned: 'User is banned',
            deleted: 'User is deleted',
            doesNotExist: 'User account does not exist!',
            bannedOrMissing: 'Your account has been banned or does not exist!',
            infoRetrieved: 'Account information retrieved successfully',
            updateSuccess: "Update data successfully!",
            noChanges: "No changes detected. Data remains the same.",
            passwordSame: "New password cannot be the same as the old password!",
            oldPasswordIncorrect: "The old password is incorrect!",
            usernameTaken: "Username is already taken by another user.",
            userNotFoundById: "User not found with the provided ID."
        },
        password :{
            resetRequest: 'Reset Password Request',
            resetEmailSent: 'Please check your email. The verification code has been sent to your account!',
            resetSuccess: 'Password reset successfully!',
            oldPasswordIncorrect: 'The old password is incorrect!',
            click: "Click",
            here: "here",
            toReset: "to reset your password.",
            newPasswordSameAsOld: 'New password cannot be the same as the old password!'
        },
        points: {
            notEnough_prefix: "You need",
            notEnough_suffix: "more points to perform this action."
        },
        common:{
            createSuccess: "Created data successfully!",
            notFound: "Data not found",
            updateSuccess: "Updated data successfully!",
        }
    },
    [Locale.vi]: {
        auth :{
            loginSuccess: "Đăng nhập thành công!",
            usernameTaken: 'Tên người dùng đã được sử dụng',
            emailExists: 'Email này đã được đăng ký',
            accountCreated: "Bạn đã tạo tài khoản thành công. Vui lòng kiểm tra email để nhận liên kết xác thực tài khoản.",
            notLoggedIn: 'Rất tiếc! Bạn chưa đăng nhập',
            unauthorized: 'Chưa được xác thực',
            logoutSuccess: 'Đăng xuất thành công',
            bannedOrNotExist: "Tài khoản của bạn đã bị khóa hoặc không tồn tại!",
            welcomeSubject: "Chào mừng đến với dịch vụ của chúng tôi!",
            welcomeMessage: "Cảm ơn bạn đã đăng ký với chúng tôi.",
            pinNote: "Mã này sẽ hết hạn sau 15 phút.",
            userOrOtpNotFound: "Người dùng hoặc mã OTP không tìm thấy",
            accountAlreadyVerified: "Tài khoản đã được xác minh",
            invalidOtpCode: "Mã OTP không hợp lệ",
            otpExpired: "Mã OTP đã hết hạn",
            emailVerifiedSuccessfully: "Email đã được xác minh thành công",
            verifyMessage: "Vui lòng xác thực địa chỉ email của bạn bằng cách nhấp vào liên kết dưới đây.",
            verifyLink: "Nhấp vào đây để xác thực email của bạn",
            emailResent: "Email đã được gửi lại. Vui lòng kiểm tra hộp thư đến của bạn.",
            checkEmail: "Vui lòng kiểm tra email của bạn để nhận liên kết xác thực.",
            accountActivated: "Tài khoản đã được kích hoạt trước đó.",
            verificationEmailSent: "Email xác thực đã được gửi!",
            emailVerificationError: "Lỗi khi gửi email xác thực.",
            emailVerificationFailed: "Không thể gửi email xác thực.",
            createAccountSuccess: "Tạo tài khoản thành công",
            accountNotActivated: "Tài khoản của bạn đã được đăng ký nhưng chưa kích hoạt.",
            resendVerification: "Vui lòng kiểm tra email để nhận liên kết xác thực hoặc gửi lại email kích hoạt.",
        },
        services: {
            entityLimitMax: "Trường giới hạn tạo backlink có giới hạn tối đa là",
            needMorePointsFirst: "Bạn cần thêm",
            expiredPoints: "Điểm của bạn đã hết hạn sử dụng",
            needMorePointsSecond: "điểm để thực hiện hành động này.",
            invalidAppPassword: "Mật khẩu ứng dụng không hợp lệ",
            emailAlreadyUsedTimesFirst: "Email đã được sử dụng",
            emailAlreadyUsedTimesSecond: "lần. Bạn có chắc chắn muốn tiếp tục không?",
            tooManyUrlsFirst: "Không thể gửi quá",
            tooManyUrlsSecond: "URL cùng lúc.",
            invalidUrls: "URL không hợp lệ",
            invalidIdRequest: "Yêu cầu không hợp lệ. Vui lòng cung cấp danh sách ID hợp lệ.",
            noValidIndexes: "Không tìm thấy index hợp lệ để xóa.",
            indexNotFoundOrDeleted: "Không tìm thấy index hoặc đã bị xóa.",
            deletedIndexesSuccessFirst: "Xóa",
            deletedIndexesSuccessSecond: "dữ liệu index thành công!"
        },
        token:{
            notFound: 'Không tìm thấy token',
            valid: 'Token hợp lệ!',
            noRefreshToken: 'Không có refresh token',
            refreshed: 'Làm mới token thành công',
            refreshFailed: 'Làm mới token thất bại',
            expired: 'Token đã hết hạn!',
            invalid: 'Token không hợp lệ',
            invalidOrExpired: 'Token không hợp lệ hoặc đã hết hạn!'
        },
        user :{
            notFound: 'Không tìm thấy người dùng',
            banned: 'Tài khoản đã bị khóa',
            deleted: 'Tài khoản đã bị xoá',
            doesNotExist: 'Tài khoản không tồn tại!',
            bannedOrMissing: 'Tài khoản của bạn đã bị khoá hoặc không tồn tại!',
            infoRetrieved: 'Lấy thông tin tài khoản thành công',
            updateSuccess: "Cập nhật dữ liệu thành công!",
            noChanges: "Không có thay đổi nào. Dữ liệu vẫn giữ nguyên.",
            passwordSame: "Mật khẩu mới không được trùng với mật khẩu cũ!",
            oldPasswordIncorrect: "Mật khẩu cũ không chính xác!",
            usernameTaken: "Tên người dùng đã được sử dụng bởi người khác.",
            userNotFoundById: "Không tìm thấy người dùng với ID đã cung cấp."
        },
        password :{
            resetRequest: 'Yêu cầu đặt lại mật khẩu',
            resetEmailSent: 'Vui lòng kiểm tra email. Mã xác minh đã được gửi đến tài khoản của bạn!',
            resetSuccess: 'Đặt lại mật khẩu thành công!',
            oldPasswordIncorrect: 'Mật khẩu cũ không đúng!',
            click: "Nhấn",
            here: "vào đây",
            toReset: "để đặt lại mật khẩu của bạn.",
            newPasswordSameAsOld: 'Mật khẩu mới không được trùng với mật khẩu cũ!'
        },
        points: {
            notEnough_prefix: "Bạn cần",
            notEnough_suffix: "điểm nữa để thực hiện hành động này."
        },
        common:{
            createSuccess: "Tạo dữ liệu thành công!",
            updateSuccess: "Cập nhật dữ liệu thành công!",
            notFound: "Không tìm thấy dữ liệu"
        }
    },
};