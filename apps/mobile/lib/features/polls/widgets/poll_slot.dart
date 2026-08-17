import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_profile.dart';
import '../../promo/promo_banner_models.dart';
import '../poll_dismiss.dart';
import '../poll_match.dart';
import '../poll_models.dart';
import '../poll_repository.dart';

class PollSlot extends StatefulWidget {
  const PollSlot({
    super.key,
    required this.surface,
    required this.profile,
    this.repository,
    this.dismissStore,
    this.padding = const EdgeInsets.fromLTRB(
      AppSpacing.md,
      AppSpacing.sm,
      AppSpacing.md,
      AppSpacing.sm,
    ),
  });

  final PromoBannerSurface surface;
  final UserProfile profile;
  final PollRepository? repository;
  final PollDismissStore? dismissStore;
  final EdgeInsetsGeometry padding;

  @override
  State<PollSlot> createState() => _PollSlotState();
}

class _PollSlotState extends State<PollSlot> {
  late final PollRepository _repository =
      widget.repository ?? PollRepository();
  late final PollDismissStore _dismiss =
      widget.dismissStore ?? PollDismissStore();

  StreamSubscription<List<Poll>>? _pollsSub;
  StreamSubscription<String?>? _voteSub;
  List<Poll> _all = const [];
  List<Poll> _visible = const [];
  int _index = 0;
  String? _myOptionId;
  bool _ready = false;
  bool _busy = false;

  Poll? get _poll =>
      _visible.isEmpty ? null : _visible[_index.clamp(0, _visible.length - 1)];

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    _pollsSub = _repository.watchActivePolls().listen(
      (polls) {
        _all = polls;
        _recompute();
      },
      onError: (Object error, StackTrace stack) {
        debugPrint('PollSlot: $error\n$stack');
        if (!mounted) return;
        setState(() {
          _all = const [];
          _visible = const [];
          _ready = true;
        });
      },
    );
    await _dismiss.warm();
    if (mounted) _recompute();
  }

  @override
  void didUpdateWidget(covariant PollSlot oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid ||
        oldWidget.profile.roleId != widget.profile.roleId ||
        oldWidget.profile.isAnonymous != widget.profile.isAnonymous ||
        oldWidget.surface != widget.surface) {
      _recompute();
    }
  }

  void _recompute() {
    if (!mounted) return;
    final role = widget.profile.roleId;
    final matched = pickPollsForSurface(
      _all,
      widget.surface,
      role: role,
      isAnonymous: widget.profile.isAnonymous,
    ).where((poll) {
      if (!poll.dismissible) return true;
      return !_dismiss.isDismissedSync(poll.id, poll.version);
    }).toList();

    setState(() {
      _visible = matched;
      if (_visible.isEmpty) {
        _index = 0;
      } else if (_index >= _visible.length) {
        _index = _visible.length - 1;
      }
      _ready = true;
    });
    _listenVote();
  }

  void _listenVote() {
    _voteSub?.cancel();
    final poll = _poll;
    final uid = widget.profile.uid;
    if (poll == null || uid.isEmpty || widget.profile.isAnonymous) {
      setState(() => _myOptionId = null);
      return;
    }
    _voteSub = _repository
        .watchMyVote(pollId: poll.id, uid: uid)
        .listen((optionId) {
      if (!mounted) return;
      setState(() => _myOptionId = optionId);
    });
  }

  Future<void> _onDismiss() async {
    final poll = _poll;
    if (poll == null || !poll.dismissible) return;
    await _dismiss.dismiss(poll.id, poll.version);
    if (!mounted) return;
    _recompute();
  }

  Future<void> _onVote(String optionId) async {
    final poll = _poll;
    if (poll == null || widget.profile.isAnonymous || _busy) return;
    if (_myOptionId != null && !poll.allowChange) return;
    setState(() => _busy = true);
    try {
      await _repository.vote(pollId: poll.id, optionId: optionId);
    } catch (_) {
      if (!mounted) return;
      final l10n = context.l10n;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.pollVoteError)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _pollsSub?.cancel();
    _voteSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _poll == null) return const SizedBox.shrink();
    final poll = _poll!;
    final locale = Localizations.localeOf(context).languageCode;
    final l10n = context.l10n;
    final canVote = !widget.profile.isAnonymous;
    final showResults =
        _myOptionId != null || poll.showResultsBeforeVote || !canVote;

    return Padding(
      padding: widget.padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PulseSheet(
            padding: const EdgeInsets.fromLTRB(14, 12, 8, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        localizePollText(poll.question, locale),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              height: 1.25,
                            ),
                      ),
                    ),
                    if (poll.dismissible)
                      IconButton(
                        tooltip: l10n.pollDismiss,
                        visualDensity: VisualDensity.compact,
                        onPressed: _onDismiss,
                        icon: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: AppColors.of(context).muted,
                        ),
                      ),
                  ],
                ),
                Text(
                  l10n.pollVoteCount(poll.voteCount),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppColors.of(context).muted,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 10),
                for (final option in poll.options) ...[
                  _PollOptionButton(
                    label: localizePollText(option.label, locale),
                    selected: _myOptionId == option.id,
                    share: pollOptionShare(poll, option.id),
                    showResults: showResults,
                    enabled: canVote &&
                        !_busy &&
                        (_myOptionId == null || poll.allowChange),
                    onTap: () => _onVote(option.id),
                  ),
                  const SizedBox(height: 8),
                ],
                if (!canVote)
                  Text(
                    l10n.pollSignIn,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.of(context).muted,
                        ),
                  ),
              ],
            ),
          ),
          if (_visible.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _visible.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _index = i);
                        _listenVote();
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: i == _index ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: i == _index
                              ? AppColors.brandOf(context)
                              : AppColors.of(context).border,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PollOptionButton extends StatelessWidget {
  const _PollOptionButton({
    required this.label,
    required this.selected,
    required this.share,
    required this.showResults,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final double share;
  final bool showResults;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);
    final percent = (share * 100).round();
    return Material(
      color: selected ? brand.withValues(alpha: 0.12) : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          children: [
            if (showResults)
              Positioned.fill(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: FractionallySizedBox(
                    widthFactor: share.clamp(0, 1),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: brand.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected ? brand : colors.border,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight:
                                selected ? FontWeight.w800 : FontWeight.w600,
                          ),
                    ),
                  ),
                  if (showResults)
                    Text(
                      '$percent%',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: colors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
