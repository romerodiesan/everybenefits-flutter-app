import 'package:cloud_firestore/cloud_firestore.dart';

/// Firestore `platformConfig/pulseAi` — global Pulse AI kill switch.
///
/// Missing doc ⇒ disabled until an admin enables Pulse AI.
class PlatformConfig {
  PlatformConfig({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> get _pulseAi =>
      _db.collection('platformConfig').doc('pulseAi');

  static bool parsePulseAiEnabled(Map<String, dynamic>? data) {
    final enabled = data?['enabled'];
    if (enabled is! bool) return false;
    return enabled;
  }

  Stream<bool> watchPulseAiEnabled() {
    return _pulseAi.snapshots().map(
      (snap) => parsePulseAiEnabled(snap.data()),
    );
  }

  Future<bool> getPulseAiEnabled() async {
    try {
      final snap = await _pulseAi.get();
      return parsePulseAiEnabled(snap.data());
    } catch (_) {
      return false;
    }
  }

  Future<void> setPulseAiEnabled({
    required bool enabled,
    required String adminUid,
  }) {
    return _pulseAi.set(
      {
        'enabled': enabled,
        'updatedAt': FieldValue.serverTimestamp(),
        'updatedBy': adminUid,
      },
      SetOptions(merge: true),
    );
  }
}
