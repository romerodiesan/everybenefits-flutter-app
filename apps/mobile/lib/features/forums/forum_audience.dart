import 'package:cloud_firestore/cloud_firestore.dart';

/// Active platform audience for proportional Spotlight (excludes deactivated /
/// pending-deletion accounts). Backed by `platformStats/overview`.
Future<int> fetchForumAudienceSize({FirebaseFirestore? firestore}) async {
  final db = firestore ?? FirebaseFirestore.instance;
  final snap = await db.collection('platformStats').doc('overview').get();
  if (!snap.exists) return 0;
  final data = snap.data() ?? const <String, dynamic>{};
  final total = (data['totalUsers'] as num?)?.toInt() ?? 0;
  final deactivated = (data['deactivated'] as num?)?.toInt() ?? 0;
  final pendingDeletion = (data['pendingDeletion'] as num?)?.toInt() ?? 0;
  final size = total - deactivated - pendingDeletion;
  return size < 0 ? 0 : size;
}
