import { FastifyInstance } from "fastify";
// import nodeMailer from "nodemailer";

export const serverCheckTool = async (
    fastify: FastifyInstance,
  ) => {
    try {
      // Check xem tool check account có đang running k
      const now = new Date();

      // Lấy tất cả tool đang chạy
      const runningTools = await fastify.prisma.tools.findMany({
        where: {
          status: "running",
          service: "social",
        },
        select: {
          id_tool: true,
          time: true, // time dạng string ISO
        },
      });

      // Nếu k có tool nào chạy
      if(runningTools?.length === 0 || !runningTools){
        return
      }

      // Lọc tool đã quá 6 phút
      const expiredTools = runningTools.filter(tool => {
        const toolTime = new Date(tool.time);
        const diffInMinutes = (now.getTime() - toolTime.getTime()) / 60000;
        return diffInMinutes > 6;
      });

      if (expiredTools.length === 0) {
        return;
      }

      // Cập nhật tất cả tool hết hạn → status = die
      // await fastify.prisma.$transaction(
      //   expiredTools.map(tool =>
      //     fastify.prisma.tools.update({
      //       where: { id_tool: tool.id_tool, service: "social" },
      //       data: {
      //         status: "die",
      //       },
      //     })
      //   )
      // );

      // const userSupport:any = await fastify.prisma.profile.findMany({
      //   where: {
      //     role: "dev",
      //   },
      //   select: {
      //     user: {
      //       select: {
      //         email: true
      //       }
      //     }
      //   },
      // });

      // console.log("userSupport", userSupport?.map((item:any)=> item?.user?.email).join(" ,"));

      // Create transporter object from nodemailer
      // const transporter = nodeMailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: Number(process.env.SMTP_PORT),
      //   secure: process.env.SMTP_SECURE === 'true',
      //   // service: process.env.EMAIL_SERVICE,
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASS,
      //   },
      // });
    
      // // Configure email content
      // const mailOptions = {
      //   from: process.env.EMAIL_SENDER, // Email sender
      //   to: "daominhngoc.tm@gmail.com", // Email recipients
      //   subject: `abc`, // Email subject
      //   html: `<p>Server Social đang sập vào check đi bạn ơi</p>`, // Nội dung email
      // };
    
      // Send email
      // await transporter.sendMail(mailOptions);
      // console.log("email đã được gửi");
      
      
    } catch (error) {
      console.log("❌ TOOL Error:", error);
    }
};