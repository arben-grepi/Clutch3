export default class User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  videos: any[];
  profilePicture: { url: string | null } | string | null;
  staffAnswers: any[];
  groups: string[];
  hasReviewed: boolean;
  country: string;
  admin: boolean;
  membership: boolean;
  staff: boolean;
  unreadMessageIds: string[];
  hasPendingGroupRequests: boolean;

  constructor(
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    profilePicture: { url: string | null } | string | null = null,
    videos: any[] = []
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.createdAt = new Date();
    this.videos = videos;
    this.profilePicture = profilePicture;
    this.staffAnswers = [];
    this.groups = [];
    this.hasReviewed = false;
    this.country = "";
    this.admin = false;
    this.membership = false;
    this.staff = false;
    this.unreadMessageIds = [];
    this.hasPendingGroupRequests = false;
  }

  // Add any authentication-related methods here
  static fromJson(json: any): User {
    const user = new User(
      json.id,
      json.email,
      json.firstName,
      json.lastName,
      json.profilePicture || null,
      json.videos || []
    );
    user.staffAnswers = json.staffAnswers || [];
    user.groups = json.groups || [];
    user.hasReviewed = !!json.hasReviewed;
    user.country = json.country || "";
    user.admin = !!json.admin;
    user.membership = !!json.membership;
    user.staff = !!json.staff;
    user.unreadMessageIds = json.unreadMessageIds || [];
    user.hasPendingGroupRequests = !!json.hasPendingGroupRequests;
    return user;
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      createdAt: this.createdAt,
      profilePicture: this.profilePicture,
      videos: this.videos,
      staffAnswers: this.staffAnswers,
      groups: this.groups,
      hasReviewed: this.hasReviewed,
      country: this.country,
      admin: this.admin,
      membership: this.membership,
      staff: this.staff,
      unreadMessageIds: this.unreadMessageIds,
      hasPendingGroupRequests: this.hasPendingGroupRequests,
    };
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
