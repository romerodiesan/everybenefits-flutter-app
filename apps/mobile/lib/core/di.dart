import '../auth/auth.dart';
import '../features/chats/chat_repository.dart';
import '../features/forums/forum_repository.dart';
import '../features/notifications/notification_repository.dart';
import '../features/university/course_repository.dart';
import '../users/users.dart';

/// Composition-root dependencies for Pulse mobile.
///
/// Construct once in [main] and pass through the widget tree — do not create
/// repositories inside shells or feature screens.
class AppDependencies {
  AppDependencies({
    required this.authService,
    required this.userRepository,
    required this.forumRepository,
    required this.chatRepository,
    required this.courseRepository,
    required this.notificationRepository,
  });

  factory AppDependencies.create() {
    final forumRepository = ForumRepository();
    return AppDependencies(
      authService: AuthService(),
      userRepository: UserRepository(
        onAuthorPhotoChanged: ({required authorId, required photoUrl}) {
          return forumRepository.syncAuthorPhotoUrl(
            authorId: authorId,
            photoUrl: photoUrl,
          );
        },
      ),
      forumRepository: forumRepository,
      chatRepository: ChatRepository(),
      courseRepository: CourseRepository(),
      notificationRepository: NotificationRepository(),
    );
  }

  final AuthService authService;
  final UserRepository userRepository;
  final ForumRepository forumRepository;
  final ChatRepository chatRepository;
  final CourseRepository courseRepository;
  final NotificationRepository notificationRepository;
}
