import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v7 as uuidv7 } from "uuid";
import { handleErrorResponse } from "../../utils/handleError";
import { generateUniqueOrderCode } from "../../utils/randomCodeDeposit";
import { createTransactionSchema } from "../../schema/transaction";
import { createUserActionLog } from "../../utils/userActionLog";

// ===================== PERMISSION CONFIGURATION =====================
enum UserRole {
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  BLOCKED = 'BLOCKED',
  NONE = 'NONE'
}

const ROLE_EMAILS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['admin@likepion.com', 'lucky@scapbot.com'],
  [UserRole.SUPPORT]: ['huongnt@scapbot.com', 'ngocdm22052003@gmail.com', 'phamvananh04112002@gmail.com'],
  [UserRole.BLOCKED]: [],
  [UserRole.NONE]: []
};

const TRANSACTION_PERMISSIONS: Record<string, UserRole[]> = {
  credit: [UserRole.ADMIN],
  debit: [UserRole.ADMIN],
  transfer: [UserRole.ADMIN],
  extend: [UserRole.ADMIN],
  give: [UserRole.ADMIN, UserRole.SUPPORT],
};

const SUPPORT_POINT_LIMIT = 1500;

// ===================== HELPER FUNCTIONS =====================
function getUserRole(email: string): UserRole {
  // Blocked has highest priority
  if (ROLE_EMAILS[UserRole.BLOCKED].includes(email)) {
    return UserRole.BLOCKED;
  }

  if (ROLE_EMAILS[UserRole.ADMIN].includes(email)) {
    return UserRole.ADMIN;
  }

  if (ROLE_EMAILS[UserRole.SUPPORT].includes(email)) {
    return UserRole.SUPPORT;
  }

  return UserRole.NONE;
}

interface PermissionCheckOptions {
  transactionType?: string;
  points?: number;
}

function checkPermission(
  email: string,
  options: PermissionCheckOptions = {}
): { allowed: boolean; message?: string; role: UserRole } {
  const role = getUserRole(email);

  // Check if blocked
  if (role === UserRole.BLOCKED) {
    return {
      allowed: false,
      message: "Tài khoản của bạn đã bị khóa",
      role
    };
  }

  // Check if has any valid role
  if (role === UserRole.NONE) {
    return {
      allowed: false,
      message: "Bạn không có quyền truy cập",
      role
    };
  }

  // Check transaction type permission
  if (options.transactionType) {
    const allowedRoles = TRANSACTION_PERMISSIONS[options.transactionType];
    if (allowedRoles && !allowedRoles.includes(role)) {
      return {
        allowed: false,
        message: "Bạn không có quyền thực hiện thao tác này",
        role
      };
    }
  }

  // Check point limit for support role
  if (role === UserRole.SUPPORT && options.points !== undefined) {
    if (options.points > SUPPORT_POINT_LIMIT) {
      return {
        allowed: false,
        message: `Bạn chỉ được phép nhập điểm nhỏ hơn ${SUPPORT_POINT_LIMIT}`,
        role
      };
    }
  }

  return { allowed: true, role };
}

function calculateNewExpiresAt(currentExpiresAt: Date | null, additionalDays: number): Date {
  const now = new Date();
  const baseDate = currentExpiresAt && currentExpiresAt > now ? currentExpiresAt : now;
  const newExpiresAt = new Date(baseDate);
  newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);
  return newExpiresAt;
}

function formatExpiresAt(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  });
}

// ===================== ROUTE HANDLERS =====================
export const createTransaction = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const data = createTransactionSchema.parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true }
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const dataReq = {
      id: uuidv7(),
      userId: user.id,
      depositId: data.depositId,
      reference: data.reference ?? null,
      type: data.type,
      service: data.service,
      description: data.description ?? `Thank you for using Likepion's services. Likepion has just refunded ${data.points} points to your account.`,
      points: data.points,
    };

    const newTransaction = await fastify.prisma.transaction.create({
      data: dataReq,
    });

    // Log after successful transaction creation
    await createUserActionLog({
      fastify,
      request,
      action: 'create',
      resource: 'transaction',
      resourceId: newTransaction.id,
      metadata: {
        userId: user.id,
        email: data.email,
        depositId: data.depositId,
        type: data.type,
        service: data.service,
        points: data.points,
        reference: data.reference,
      },
    });

    return reply.status(201).send({
      success: true,
      message: "Transaction created successfully",
      transaction: newTransaction,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const handlePointTransactionByAdmin = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const formData: any = request.body;
    const { email: EmailSupport } = request.user;

    // ===================== INITIAL PERMISSION CHECK =====================
    const initialPermission = checkPermission(EmailSupport);
    if (!initialPermission.allowed) {
      return reply.code(403).send({
        message: initialPermission.message,
        success: false
      });
    }

    const { currency, email, money_vnd, points, transactionType, description, expiresAt }: any = formData;

    // ===================== VALIDATE TRANSACTION TYPE =====================
    const transactionPermission = checkPermission(EmailSupport, {
      transactionType,
      points: Number(points)
    });

    if (!transactionPermission.allowed) {
      return reply.code(403).send({
        message: transactionPermission.message,
        success: false
      });
    }

    // ===================== FETCH DATA =====================
    const [userExists, creditData]: any = await Promise.all([
      fastify.prisma.user.findUnique({
        where: { email: email },
        select: { id: true, expiresAt: true }
      }),
      fastify.prisma.credit.findFirst({
        where: { name: "bank transfer" },
        select: { name: true, id: true }
      }),
    ]);

    if (!userExists) {
      return reply.status(404).send({
        message: "User not found",
        success: false
      });
    }

    if (!creditData && transactionType === "credit") {
      return reply.status(400).send({
        message: "Credit method not found",
        success: false
      });
    }

    // ===================== HANDLE TRANSACTION TYPES =====================
    switch (transactionType) {
      case "credit": {
        const uniqueOrderCode = await generateUniqueOrderCode(fastify.prisma);
        const dataReq = {
          id: uuidv7(),
          user: { connect: { id: userExists.id } },
          credit: { connect: { id: creditData.id } },
          quantity: 1,
          currency: currency,
          money_vnd: money_vnd,
          status: "completed",
          order_code: uniqueOrderCode,
        };

        let depositId: string;
        let transactionId: string;

        await fastify.prisma.$transaction(async (prisma: any) => {
          const deposit = await prisma.deposit.create({
            data: dataReq,
            select: { id: true },
          });
          depositId = deposit.id;

          const transaction = await prisma.transaction.create({
            data: {
              id: uuidv7(),
              userId: userExists.id,
              depositId: deposit.id,
              type: "credit",
              service: creditData.name,
              description: description ?? `Thank you for using Likepion's services. Likepion has just added ${points} points to your account.`,
              points: points,
            },
          });
          transactionId = transaction.id;
        });

        if (expiresAt) {
          const additionalDays = parseInt(expiresAt);
          const newExpiresAt = calculateNewExpiresAt(userExists.expiresAt, additionalDays);

          await fastify.prisma.user.update({
            where: { id: userExists.id },
            data: { expiresAt: newExpiresAt },
          });
        }

        // Log credit transaction
        await createUserActionLog({
          fastify,
          request,
          action: 'credit',
          resource: 'transaction',
          resourceId: transactionId!,
          metadata: {
            targetUserId: userExists.id,
            targetUserEmail: email,
            depositId: depositId!,
            orderCode: uniqueOrderCode,
            currency,
            money_vnd,
            points,
            expiresAt,
            adminEmail: EmailSupport,
            description,
          },
        });

        return reply.send({ success: true });
      }

      case "debit": {
        const transaction = await fastify.prisma.transaction.create({
          data: {
            id: uuidv7(),
            userId: userExists.id,
            type: "debit",
            service: "",
            description,
            points,
          },
        });

        // Log debit transaction
        await createUserActionLog({
          fastify,
          request,
          action: 'debit',
          resource: 'transaction',
          resourceId: transaction.id,
          metadata: {
            targetUserId: userExists.id,
            targetUserEmail: email,
            points,
            description,
            adminEmail: EmailSupport,
          },
        });

        return reply.send({ success: true });
      }

      case "transfer": {
        // TODO: Implement transfer logic
        return reply.code(501).send({
          message: "Transfer chưa được hỗ trợ",
          success: false
        });
      }

      case "give": {
        const additionalDays = parseInt(expiresAt);
        const newExpiresAt = calculateNewExpiresAt(userExists.expiresAt, additionalDays);
        const formattedExpiresAt = formatExpiresAt(newExpiresAt);

        const transactionDescription =
          `Likepion xin cảm ơn bạn vì đã tin tưởng sử dụng dịch vụ. ` +
          `Tài khoản của bạn vừa được cộng ${points} điểm. ` +
          `Thời hạn sử dụng đến: ${formattedExpiresAt}.`;

        let transactionId: string;

        await fastify.prisma.$transaction(async (prisma: any) => {
          const transaction = await prisma.transaction.create({
            data: {
              id: uuidv7(),
              userId: userExists.id,
              type: "credit",
              service: "give points",
              description: transactionDescription,
              points: points,
            },
          });
          transactionId = transaction.id;
        });

        await fastify.prisma.user.update({
          where: { id: userExists.id },
          data: { expiresAt: newExpiresAt },
        });

        // Log give points action
        await createUserActionLog({
          fastify,
          request,
          action: 'give_points',
          resource: 'transaction',
          resourceId: transactionId!,
          metadata: {
            targetUserId: userExists.id,
            targetUserEmail: email,
            points,
            expiresAt: additionalDays,
            newExpiresAt: newExpiresAt.toISOString(),
            formattedExpiresAt,
            adminEmail: EmailSupport,
            description: transactionDescription,
          },
        });

        return reply.send({ success: true });
      }

      case "extend": {
        const additionalDays = parseInt(expiresAt);
        const newExpiresAt = calculateNewExpiresAt(userExists.expiresAt, additionalDays);
        const formattedExpiresAt = formatExpiresAt(newExpiresAt);

        const transactionDescription =
          `Likepion xin cảm ơn bạn vì đã tin tưởng sử dụng dịch vụ. ` +
          `Tài khoản của bạn vừa được cộng thêm ${expiresAt} ngày sử dụng điểm. ` +
          `Thời hạn sử dụng đến: ${formattedExpiresAt}.`;

        let transactionId: string;

        await fastify.prisma.$transaction(async (prisma: any) => {
          const transaction = await prisma.transaction.create({
            data: {
              id: uuidv7(),
              userId: userExists.id,
              type: "credit",
              service: "extend usage",
              description: transactionDescription,
              points: 0,
            },
          });
          transactionId = transaction.id;
        });

        await fastify.prisma.user.update({
          where: { id: userExists.id },
          data: { expiresAt: newExpiresAt },
        });

        // Log extend usage action
        await createUserActionLog({
          fastify,
          request,
          action: 'extend_usage',
          resource: 'transaction',
          resourceId: transactionId!,
          metadata: {
            targetUserId: userExists.id,
            targetUserEmail: email,
            additionalDays,
            oldExpiresAt: userExists.expiresAt?.toISOString() || null,
            newExpiresAt: newExpiresAt.toISOString(),
            formattedExpiresAt,
            adminEmail: EmailSupport,
            description: transactionDescription,
          },
        });

        return reply.send({ success: true });
      }

      default:
        return reply.status(400).send({
          message: "Invalid transaction type",
          success: false
        });
    }

  } catch (error) {
    console.log("error", error);
    handleErrorResponse(reply, error);
  }
};