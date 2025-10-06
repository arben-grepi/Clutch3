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
    };
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
