import { SocialStatus } from "@prisma/client";

export type ISocialRequest = {
  id?: string;
  name: string;
  userId: string;
  socialGroupId: string;
  percentage: number;
  share_code: boolean;
  email_report: boolean;
  unique_url: boolean;
  id_tool?: string;
  auction_price: number;
  url_list: {
    website: string;
    language: string;
    title: string;
    type: SocialType;
    content: string;
    keyword: string;
    image_link: string;
  }[];
  socialAccountIds: string[];
  status?: SocialStatus;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type SocialType = "AI" | "manual";